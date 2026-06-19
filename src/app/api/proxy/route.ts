import { NextResponse } from 'next/server';

const EXCLUDED_REQUEST_HEADERS = [
  'x-proxy-target-url',
  'x-proxy-method',
  'x-proxy-cookie',
  'host',
  'connection',
  'content-length',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'accept-encoding',
];

// `content-length` is dropped because undici transparently decompresses the
// upstream body, so the upstream length (the *compressed* size) no longer
// matches the bytes we forward — keeping it truncates the response in the
// browser. Let the framework recompute it. `content-encoding`/`transfer-encoding`
// are stale for the same decompression reason.
const EXCLUDED_RESPONSE_HEADERS = ['content-encoding', 'transfer-encoding', 'connection', 'content-length'];

const BODY_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export async function POST(req: Request) {
  try {
    const targetUrl = req.headers.get('x-proxy-target-url');
    const targetMethod = req.headers.get('x-proxy-method') ?? 'GET';

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing X-Proxy-Target-Url header' }, { status: 400 });
    }

    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      if (EXCLUDED_REQUEST_HEADERS.includes(key.toLowerCase())) return;
      forwardHeaders.set(key, value);
    });

    // `Cookie` is a forbidden header for the client fetch, so the cookie jar
    // sends it as X-Proxy-Cookie; restore it as the real Cookie header here.
    const proxyCookie = req.headers.get('x-proxy-cookie');
    if (proxyCookie) forwardHeaders.set('cookie', proxyCookie);

    let body: ArrayBuffer | undefined;
    if (BODY_METHODS.includes(targetMethod)) {
      const buffer = await req.arrayBuffer();
      if (buffer.byteLength > 0) body = buffer;
    }

    const start = performance.now();
    const targetRes = await fetch(targetUrl, {
      method: targetMethod,
      headers: forwardHeaders,
      body,
      redirect: 'follow',
    });
    const end = performance.now();

    const resBuffer = await targetRes.arrayBuffer();

    const resHeaders = new Headers();
    targetRes.headers.forEach((value, key) => {
      if (EXCLUDED_RESPONSE_HEADERS.includes(key.toLowerCase())) return;
      resHeaders.set(key, value);
    });
    resHeaders.set('X-Proxy-Time', Math.round(end - start).toString());

    return new NextResponse(resBuffer, {
      status: targetRes.status,
      statusText: targetRes.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    console.error('Proxy Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
