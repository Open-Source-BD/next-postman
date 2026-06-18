import type { EnvVar, ResponseData, TabState } from '../types';
import { PmSandbox } from './pmSandbox';
import { sendViaProxy } from './proxyClient';

export interface ExecuteResult {
  /** Populated when the request was sent and a response (any status) came back. */
  response: ResponseData | null;
  /** Final target URL (with resolved params), when a request was sent. */
  finalUrl?: string;
  /** Set when the request never produced a response. */
  error?: { phase: 'pre-request' | 'send'; message: string };
}

export interface ExecuteOptions {
  /** Called when a script does `pm.environment.set` — caller decides where it lands. */
  onSetVar?: (key: string, value: string) => void;
  /** Current iteration's data row (Collection Runner). Seeds vars + `pm.iterationData`. */
  iterationData?: Record<string, string>;
  /** External cancel signal (Collection Runner Cancel button). */
  signal?: AbortSignal;
  /** Per-request timeout in ms. Default 30s. */
  timeoutMs?: number;
}

/**
 * Framework-free send/test pipeline shared by single-send (useRequestRunner) and
 * the Collection Runner. Runs the pre-request script, sends via the proxy using
 * the POST-script variable bag (so a pre-request `pm.environment.set` reaches
 * `{{var}}` interpolation), then runs tests. Never throws, never touches the UI.
 */
export async function executeRequest(
  tab: TabState,
  seedVars: EnvVar[],
  opts: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const sandbox = new PmSandbox(seedVars, opts.onSetVar ?? (() => {}), opts.iterationData);

  try {
    sandbox.runPreRequest(tab.scripts);
  } catch (e) {
    return { response: null, error: { phase: 'pre-request', message: (e as Error).message } };
  }

  // Read vars AFTER the pre-request script so its mutations drive interpolation.
  const vars = sandbox.currentVars();

  // Combine the external cancel signal with a per-request timeout.
  const ctrl = new AbortController();
  const onExternalAbort = () => ctrl.abort();
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);

  try {
    const { finalUrl, ...resData } = await sendViaProxy(tab, vars, ctrl.signal);
    sandbox.attachResponse(resData.status, resData.statusText, resData.rawText);
    sandbox.runTests(tab.tests);
    return { response: { ...resData, testResults: sandbox.testResults }, finalUrl };
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError' || ctrl.signal.aborted;
    return {
      response: null,
      error: { phase: 'send', message: aborted ? 'Request cancelled or timed out' : (e as Error).message },
    };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}
