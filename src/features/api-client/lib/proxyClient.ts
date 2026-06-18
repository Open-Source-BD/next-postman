import type { EnvVar, TabState } from '../types';
import { resolveEnv } from './envResolver';

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

const BODY_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Ensure a URL has a protocol; returns the normalized string. */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'http://' + trimmed;
}

/**
 * Build the request from tab state and send it through the `/api/proxy`
 * route handler. Returns parsed response metadata (without test results).
 */
export async function sendViaProxy(
  tab: TabState,
  environments: EnvVar[],
  signal?: AbortSignal
): Promise<ProxyResult> {
  const r = (s: string) => resolveEnv(s, environments);

  const url = new URL(normalizeUrl(r(tab.url)));
  tab.params.forEach((p) => {
    if (p.key) url.searchParams.append(r(p.key), r(p.value));
  });

  const fetchHeaders = new Headers();
  tab.headers.forEach((h) => {
    if (h.key) fetchHeaders.append(r(h.key), r(h.value));
  });

  const auth = tab.auth;
  if (auth.type === 'bearer' && auth.bearer) {
    fetchHeaders.set('Authorization', `Bearer ${r(auth.bearer)}`);
  } else if (auth.type === 'basic' && auth.basicUser) {
    fetchHeaders.set('Authorization', `Basic ${btoa(r(auth.basicUser) + ':' + r(auth.basicPass))}`);
  } else if (auth.type === 'apikey' && auth.apiKeyName) {
    if (auth.apiKeyIn === 'query') url.searchParams.append(r(auth.apiKeyName), r(auth.apiKeyValue));
    else fetchHeaders.set(r(auth.apiKeyName), r(auth.apiKeyValue));
  } else if (auth.type === 'oauth2' && auth.oauthToken) {
    fetchHeaders.set('Authorization', `Bearer ${r(auth.oauthToken)}`);
  } else if (auth.type === 'jwt' && auth.jwtToken) {
    const prefix = auth.jwtPrefix?.trim();
    fetchHeaders.set('Authorization', prefix ? `${prefix} ${r(auth.jwtToken)}` : r(auth.jwtToken));
  }

  let fetchBody: BodyInit | undefined;

  if (BODY_METHODS.includes(tab.method) && tab.body.type !== 'none') {
    if (tab.body.type === 'raw') {
      fetchBody = r(tab.body.rawContent);
      if (!fetchHeaders.has('Content-Type')) fetchHeaders.set('Content-Type', tab.body.rawType);
    } else if (tab.body.type === 'formdata') {
      const fd = new FormData();
      tab.body.formdata.forEach((item) => {
        if (!item.key) return;
        if (item.type === 'file' && item.file) fd.append(r(item.key), item.file);
        else fd.append(r(item.key), r(item.value));
      });
      fetchBody = fd;
    } else if (tab.body.type === 'urlencoded') {
      const usp = new URLSearchParams();
      tab.body.urlencoded.forEach((item) => {
        if (item.key) usp.append(r(item.key), r(item.value));
      });
      fetchBody = usp;
      if (!fetchHeaders.has('Content-Type')) {
        fetchHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
      }
    } else if (tab.body.type === 'graphql') {
      const g = tab.body.graphql ?? { query: '', variables: '' };
      let vars: unknown = {};
      try { vars = g.variables.trim() ? JSON.parse(g.variables) : {}; } catch { vars = {}; }
      fetchBody = JSON.stringify({ query: r(g.query), variables: vars });
      if (!fetchHeaders.has('Content-Type')) fetchHeaders.set('Content-Type', 'application/json');
    }
  }

  const proxyHeaders = new Headers(fetchHeaders);
  proxyHeaders.set('X-Proxy-Target-Url', url.toString());
  proxyHeaders.set('X-Proxy-Method', tab.method);

  // Let fetch set the multipart boundary itself for form-data.
  if (tab.body.type === 'formdata' && fetchBody instanceof FormData) {
    proxyHeaders.delete('Content-Type');
  }

  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: proxyHeaders,
    body: fetchBody,
    signal,
  });

  const rawText = await response.text();
  const size = new Blob([rawText]).size;

  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const timeTaken = parseInt(headers['x-proxy-time'] || '0', 10);
  delete headers['x-proxy-time'];

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    timeTaken,
    size,
    rawText,
    headers,
    finalUrl: url.toString(),
  };
}
