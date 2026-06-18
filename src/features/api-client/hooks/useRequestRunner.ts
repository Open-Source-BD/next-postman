'use client';
import { useCallback } from 'react';
import { selectActiveTab, selectActiveVars, useApiStore } from '../store/useApiStore';
import { executeRequest } from '../lib/executeRequest';
import { resolveEnv } from '../lib/envResolver';
import { cookieHeaderFor } from '../lib/cookies';
import { generateId } from '../lib/id';
import type { TabState } from '../types';

/** Returns a `send` callback that runs scripts, sends via proxy, records history. */
export function useRequestRunner(): () => Promise<void> {
  return useCallback(async () => {
    const state = useApiStore.getState();
    const tab = selectActiveTab(state);
    if (!tab.url) return;
    // Realtime tabs (ws/sse) don't use the HTTP send pipeline.
    if (tab.protocol && tab.protocol !== 'http') return;

    state.setIsLoading(true);

    const vars = selectActiveVars(state);

    // Persist a protocol back into the visible URL when one is missing.
    const resolved = resolveEnv(tab.url, vars).trim();
    if (!/^https?:\/\//i.test(resolved)) {
      state.updateActiveTab({ url: 'http://' + resolved });
    }

    // Single-send persists script var writes to the active env (via setEnvVar)
    // and auto-attaches jar cookies for the target host.
    const cookieHeader = cookieHeaderFor(state.cookieJar, resolved);
    const result = await executeRequest(tab, vars, { onSetVar: state.setEnvVar, cookieHeader });

    if (result.error?.phase === 'pre-request') {
      alert('Pre-request Script Error:\n' + result.error.message);
      state.setIsLoading(false);
      return;
    }

    if (result.error || !result.response) {
      state.updateActiveTab({
        response: {
          ok: false,
          status: 0,
          statusText: 'Proxy Error',
          timeTaken: 0,
          size: 0,
          rawText: result.error?.message ?? 'Request failed',
          headers: {},
          testResults: [],
        },
        activeResTab: 'body',
      });
      state.setIsLoading(false);
      return;
    }

    // Keep the prior response for the Diff view before overwriting it.
    state.updateActiveTab({ response: result.response, prevResponse: tab.response, activeResTab: 'body' });
    state.captureCookies(result.finalUrl ?? tab.url, result.response.headers['set-cookie']);
    const snapshot: TabState = { ...JSON.parse(JSON.stringify(tab)), response: null, sourceNodeId: undefined };
    state.addHistory({
      id: generateId(),
      method: tab.method,
      url: result.finalUrl ?? tab.url,
      status: result.response.status,
      time: result.response.timeTaken,
      date: new Date().toISOString(),
      request: snapshot,
    });
    state.setIsLoading(false);
  }, []);
}
