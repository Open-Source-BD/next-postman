import { NextResponse } from 'next/server';

// Long-lived streaming proxy for SSE. Never prerender; allow a long window.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const EXCLUDED_REQUEST_HEADERS = [
  'x-proxy-target-url',
  'x-proxy-method',
  'x-proxy-cookie',
  'x-proxy-last-event-id',
  'host',
  'connection',
  'content-length',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'accept-encoding',
];

const BODY_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Light guard: cap concurrent open upstream streams (resource exhaustion).
const MAX_CONCURRENT = 20;
let active = 0;

export async function POST(req: Request) {
  const targetUrl = req.headers.get('x-proxy-target-url');
  const method = (req.headers.get('x-proxy-method') ?? 'GET').toUpperCase();

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing X-Proxy-Target-Url header' }, { status: 400 });
  }
  // Light guard: only http(s) targets (no file:, ws:, etc.).
  if (!/^https?:\/\//i.test(targetUrl)) {
    return NextResponse.json({ error: 'Only http(s) targets are allowed' }, { status: 400 });
  }
  if (active >= MAX_CONCURRENT) {
    return NextResponse.json({ error: 'Too many concurrent streams' }, { status: 503 });
  }

  const fwd = new Headers();
  req.headers.forEach((value, key) => {
    if (EXCLUDED_REQUEST_HEADERS.includes(key.toLowerCase())) return;
    fwd.set(key, value);
  });
  fwd.set('Accept', 'text/event-stream');
  const cookie = req.headers.get('x-proxy-cookie');
  if (cookie) fwd.set('cookie', cookie);
  const lastEventId = req.headers.get('x-proxy-last-event-id');
  if (lastEventId) fwd.set('Last-Event-ID', lastEventId);

  let body: ArrayBuffer | undefined;
  if (BODY_METHODS.includes(method)) {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) body = buf;
  }

  // Abort the upstream fetch when the client disconnects.
  const upstreamAbort = new AbortController();
  req.signal.addEventListener('abort', () => upstreamAbort.abort());

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { method, headers: fwd, body, redirect: 'follow', signal: upstreamAbort.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upstream connection failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    // Status is still settable (we haven't started streaming) → client sees !ok.
    return NextResponse.json(
      { error: `Upstream responded ${upstream.status} ${upstream.statusText}` },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }

  active++;
  let cleaned = false;
  const cleanup = () => {
    if (!cleaned) {
      cleaned = true;
      active--;
    }
  };

  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          cleanup();
        } else {
          controller.enqueue(value);
        }
      } catch (e) {
        controller.error(e);
        cleanup();
      }
    },
    cancel() {
      upstreamAbort.abort();
      cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
