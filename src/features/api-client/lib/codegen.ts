import type { CodeLang, EnvVar, TabState } from '../types';
import { resolveEnv } from './envResolver';

/** Generate a code snippet for the given request. Currently supports curl. */
export function generateCode(
  tab: TabState,
  environments: EnvVar[],
  lang: CodeLang = 'curl'
): string {
  const r = (s: string) => resolveEnv(s, environments);

  const headers: Record<string, string> = {};
  tab.headers.forEach((h) => {
    if (h.key) headers[r(h.key)] = r(h.value);
  });
  if (tab.auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${r(tab.auth.bearer)}`;
  }

  // lang is reserved for future targets (fetch, axios, ...). curl for now.
  void lang;

  let snippet = `curl -X ${tab.method} ${r(tab.url)}\n`;
  Object.keys(headers).forEach((k) => {
    snippet += `  -H "${k}: ${headers[k]}"\n`;
  });
  return snippet;
}
