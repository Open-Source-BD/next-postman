import { describe, expect, it, vi, afterEach } from 'vitest';
import { POST } from './route';

afterEach(() => vi.restoreAllMocks());

function proxyReq(targetUrl: string, method = 'GET'): Request {
  return new Request('http://localhost/api/proxy', {
    method: 'POST',
    headers: { 'X-Proxy-Target-Url': targetUrl, 'X-Proxy-Method': method },
  });
}

describe('proxy route response headers', () => {
  it('drops the upstream content-length so a decompressed body is not truncated', async () => {
    // undici decompresses upstream gzip/brotli, so the upstream content-length
    // (the *compressed* size) is smaller than the bytes we forward. Forwarding it
    // truncated large JSON in the browser → JSON.parse failed → Pretty/Types vanished.
    const fullBody = JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: i })));
    const upstream = new Response(fullBody, {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'content-length': '40', // stale compressed length, far smaller than fullBody
        'content-encoding': 'gzip',
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream));

    const res = await POST(proxyReq('https://example.com/todos'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('content-encoding')).toBeNull();
    const text = await res.text();
    expect(text).toBe(fullBody);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('400s when the target URL header is missing', async () => {
    const req = new Request('http://localhost/api/proxy', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
