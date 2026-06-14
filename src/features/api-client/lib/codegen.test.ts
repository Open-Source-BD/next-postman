import { describe, expect, it } from 'vitest';
import { generateCode } from './codegen';
import type { EnvVar, TabState } from '../types';

const baseTab: TabState = {
  id: 't1',
  method: 'POST',
  url: 'https://{{host}}/users',
  params: [],
  headers: [{ id: 'h1', key: 'X-Custom', value: '{{ver}}' }],
  auth: { type: 'bearer', bearer: '{{token}}', basicUser: '', basicPass: '' },
  body: { type: 'none', formdata: [], urlencoded: [], rawContent: '', rawType: 'application/json' },
  scripts: '',
  tests: '',
  response: null,
  activeSubTab: 'params',
  activeResTab: 'body',
};

const env: EnvVar[] = [
  { id: '1', key: 'host', value: 'api.example.com' },
  { id: '2', key: 'ver', value: 'v1' },
  { id: '3', key: 'token', value: 'abc123' },
];

describe('generateCode (curl)', () => {
  it('resolves env in url, headers, and bearer auth', () => {
    const out = generateCode(baseTab, env);
    expect(out).toContain('curl -X POST https://api.example.com/users');
    expect(out).toContain('-H "X-Custom: v1"');
    expect(out).toContain('-H "Authorization: Bearer abc123"');
  });

  it('omits Authorization when auth type is none', () => {
    const out = generateCode({ ...baseTab, auth: { ...baseTab.auth, type: 'none' } }, env);
    expect(out).not.toContain('Authorization');
  });
});
