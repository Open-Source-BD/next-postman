import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./proxyClient', async (orig) => ({
  ...(await orig<typeof import('./proxyClient')>()),
  sendViaProxy: vi.fn(),
}));

import { sendViaProxy } from './proxyClient';
import { executeRequest } from './executeRequest';
import { createDefaultTab } from '../store/useApiStore';

const mockSend = sendViaProxy as unknown as ReturnType<typeof vi.fn>;

function proxyRes(body: string, status = 200) {
  return {
    ok: status < 400,
    status,
    statusText: 'OK',
    timeTaken: 5,
    size: body.length,
    rawText: body,
    headers: {},
    finalUrl: 'http://example.test',
  };
}

beforeEach(() => mockSend.mockReset());

describe('executeRequest', () => {
  it('happy path returns response and runs tests', async () => {
    mockSend.mockResolvedValue(proxyRes('{"id":1}'));
    const tab = createDefaultTab();
    tab.url = 'http://example.test';
    tab.tests = 'pm.test("ok", () => pm.expect(pm.response.code).to.eql(200))';
    const r = await executeRequest(tab, []);
    expect(r.response?.status).toBe(200);
    expect(r.response?.testResults[0]).toMatchObject({ name: 'ok', pass: true });
  });

  it('pre-request script error returns {phase:pre-request} and does not send', async () => {
    const tab = createDefaultTab();
    tab.scripts = 'throw new Error("boom")';
    const r = await executeRequest(tab, []);
    expect(r.error?.phase).toBe('pre-request');
    expect(r.response).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('pre-request variable mutation reaches sendViaProxy (latent bug fix)', async () => {
    mockSend.mockResolvedValue(proxyRes('{}'));
    const tab = createDefaultTab();
    tab.scripts = 'pm.environment.set("tok", "T1")';
    await executeRequest(tab, []);
    const varsArg = mockSend.mock.calls[0][1] as { key: string; value: string }[];
    expect(varsArg.find((v) => v.key === 'tok')?.value).toBe('T1');
  });

  it('send failure returns {phase:send} with null response', async () => {
    mockSend.mockRejectedValueOnce(new Error('network down'));
    const tab = createDefaultTab();
    const r = await executeRequest(tab, []);
    expect(r.response).toBeNull();
    expect(r.error?.phase).toBe('send');
  });

  it('forwards script env writes to onSetVar', async () => {
    mockSend.mockResolvedValue(proxyRes('{}'));
    const onSet = vi.fn();
    const tab = createDefaultTab();
    tab.scripts = 'pm.environment.set("a", "b")';
    await executeRequest(tab, [], { onSetVar: onSet });
    expect(onSet).toHaveBeenCalledWith('a', 'b');
  });
});
