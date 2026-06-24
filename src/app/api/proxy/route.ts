import { NextResponse } from 'next/server';

export const maxDuration = 30;

const EXCLUDED_REQUEST_HEADERS = [
  'x-proxy-target-url',
  'x-proxy-method',
  'x-proxy-cookie',
  'cookie',
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

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Check if the target is the same server that is handling this request.
 * Fetching yourself from inside a route handler can crash the dev server
 * (re-entrancy / connection-pool contention), so we block it early.
 */
function isSelfReference(targetUrl: string, hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  try {
    const target = new URL(targetUrl);
    const hostParts = hostHeader.split(':');
    const hostname = hostParts[0];
    const defaultPort = target.protocol === 'https:' ? '443' : '80';
    const port = hostParts[1] ?? defaultPort;

    if (LOCAL_HOSTNAMES.has(target.hostname) && hostname === target.hostname && (target.port || defaultPort) === port) {
      return `Cannot proxy to the same server (${target.hostname}:${port}). Run the API on a different port.`;
    }
  } catch {
    // invalid URL — let fetch handle it naturally
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const targetUrl = req.headers.get('x-proxy-target-url');
    const targetMethod = req.headers.get('x-proxy-method') ?? 'GET';

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing X-Proxy-Target-Url header' }, { status: 400 });
    }

    const refError = isSelfReference(targetUrl, req.headers.get('host'));
    if (refError) {
      return NextResponse.json({ error: refError }, { status: 400 });
    }

    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      if (EXCLUDED_REQUEST_HEADERS.includes(key.toLowerCase())) return;
      forwardHeaders.set(key, value);
    });

    // The cookie jar sends its value as X-Proxy-Cookie (Cookie is a forbidden
    // header for client fetch); restore it here. Browser ambient cookies are
    // excluded via EXCLUDED_REQUEST_HEADERS so they don't leak to the target.
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
      signal: AbortSignal.timeout(30000),
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
    const cause = (error as Error).cause as NodeJS.ErrnoException | undefined;
    const code = cause?.code;
    if (code === 'ECONNREFUSED') {
      return NextResponse.json({ error: 'Connection refused — is the target server running?' }, { status: 502 });
    }
    if (code === 'ENOTFOUND') {
      return NextResponse.json({ error: 'DNS lookup failed — check the hostname.' }, { status: 502 });
    }
    if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
      return NextResponse.json({ error: 'Connection timed out — the server is unreachable.' }, { status: 504 });
    }
    if (code === 'ECONNRESET') {
      return NextResponse.json({ error: 'Connection reset — the server closed the connection.' }, { status: 502 });
    }
    if ((error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out (30s limit) — the target server is too slow.' },
        { status: 504 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
