import type { EnvVar, TabState } from '../types';
import { buildProxyRequest, normalizeUrl } from './buildProxyRequest';

export { normalizeUrl };

export interface ProxyResult {
  ok: boolean;
  status: number;
  statusText: string;
  timeTaken: number;
  size: number;
  rawText: string;
  headers: Record<string, string>;
  /** Final target URL (with query params, protocol-normalized). */
  finalUrl: string;
}

/**
 * Build the request from tab state and send it through the `/api/proxy`
 * route handler. Returns parsed response metadata (without test results).
 */
export async function sendViaProxy(
  tab: TabState,
  environments: EnvVar[],
  signal?: AbortSignal,
  cookieHeader?: string
): Promise<ProxyResult> {
  const { finalUrl, method, headers, body: fetchBody, isFormData } = buildProxyRequest(tab, environments);

  const proxyHeaders = new Headers(headers);
  proxyHeaders.set('X-Proxy-Target-Url', finalUrl);
  proxyHeaders.set('X-Proxy-Method', method);
  // `Cookie` is a forbidden fetch header; smuggle the jar's cookies via a
  // custom header the proxy restores. Don't override an explicit Cookie header.
  if (cookieHeader && !headers.has('Cookie')) proxyHeaders.set('X-Proxy-Cookie', cookieHeader);

  // Let fetch set the multipart boundary itself for form-data.
  if (isFormData) proxyHeaders.delete('Content-Type');

  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: proxyHeaders,
    body: fetchBody,
    signal,
  });

  const rawText = await response.text();
  const size = new Blob([rawText]).size;

  const resHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    resHeaders[k] = v;
  });
  const timeTaken = parseInt(resHeaders['x-proxy-time'] || '0', 10);
  delete resHeaders['x-proxy-time'];

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    timeTaken,
    size,
    rawText,
    headers: resHeaders,
    finalUrl,
  };
}
