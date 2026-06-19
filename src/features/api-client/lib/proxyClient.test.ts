import { describe, expect, it, vi, afterEach } from 'vitest';
import { sendDirect } from './proxyClient';
import { sanitizeDirectHeaders } from './buildProxyRequest';
import type { TabState } from '../types';

const tab = (over: Partial<TabState> = {}): TabState =>
  ({
    id: 't', method: 'GET', url: 'https://api.example.com/x',
    params: [], headers: [], auth: { type: 'none' } as TabState['auth'],
    body: { type: 'none', formdata: [], urlencoded: [], rawContent: '', rawType: 'application/json' },
    scripts: '', tests: '', response: null, activeSubTab: 'params', activeResTab: 'body',
    ...over,
  }) as TabState;

afterEach(() => vi.restoreAllMocks());

describe('sanitizeDirectHeaders', () => {
  it('strips forbidden and proxy-only headers, keeps the rest', () => {
    const h = new Headers();
    h.set('Authorization', 'Bearer x');
    h.set('Cookie', 'sid=1');
    h.set('X-Proxy-Cookie', 'sid=1');
    h.set('Host', 'evil.com');
    h.set('Content-Type', 'application/json');
    const out = sanitizeDirectHeaders(h);
    expect(out.get('authorization')).toBe('Bearer x');
    expect(out.get('content-type')).toBe('application/json');
    expect(out.has('cookie')).toBe(false);
    expect(out.has('x-proxy-cookie')).toBe(false);
    expect(out.has('host')).toBe(false);
  });
});

describe('sendDirect', () => {
  it('maps a fetch Response to a direct ProxyResult, client-timed', async () => {
    const res = new Response('{"ok":true}', { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' } });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res);

    const out = await sendDirect(tab(), []);
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/x', expect.objectContaining({ method: 'GET', credentials: 'omit' }));
    expect(out.transport).toBe('direct');
    expect(out.status).toBe(200);
    expect(out.rawText).toBe('{"ok":true}');
    expect(out.headers['content-type']).toBe('application/json');
    expect(out.timeTaken).toBeGreaterThanOrEqual(0);
    expect(out.finalUrl).toBe('https://api.example.com/x');
  });

  it('does not send a Cookie header on the direct fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    await sendDirect(tab({ headers: [{ id: 'c', key: 'Cookie', value: 'sid=1', type: 'text' }] }), []);
    const passedHeaders = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(passedHeaders.has('cookie')).toBe(false);
  });

  it('lets the browser set the multipart boundary (no Content-Type) for form-data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    await sendDirect(tab({ method: 'POST', body: { type: 'formdata', formdata: [{ id: 'k', key: 'f', value: 'x', type: 'text' }], urlencoded: [], rawContent: '', rawType: 'application/json' } }), []);
    const passedHeaders = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(passedHeaders.has('content-type')).toBe(false);
  });

  it('propagates a fetch TypeError (CORS/network) to the caller', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(sendDirect(tab(), [])).rejects.toThrow(/Failed to fetch/);
  });
});
