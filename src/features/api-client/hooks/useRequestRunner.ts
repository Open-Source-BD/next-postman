'use client';
import { useCallback } from 'react';
import { selectActiveTab, useApiStore } from '../store/useApiStore';
import { PmSandbox } from '../lib/pmSandbox';
import { sendViaProxy } from '../lib/proxyClient';
import { resolveEnv } from '../lib/envResolver';
import { generateId } from '../lib/id';

/** Returns a `send` callback that runs scripts, sends via proxy, records history. */
export function useRequestRunner(): () => Promise<void> {
  return useCallback(async () => {
    const state = useApiStore.getState();
    const tab = selectActiveTab(state);
    if (!tab.url) return;

    state.setIsLoading(true);

    const sandbox = new PmSandbox(state.environments, state.setEnvVar);

    try {
      sandbox.runPreRequest(tab.scripts);
    } catch (e) {
      alert('Pre-request Script Error:\n' + (e as Error).message);
      state.setIsLoading(false);
      return;
    }

    // Persist a protocol back into the visible URL when one is missing.
    const resolved = resolveEnv(tab.url, state.environments).trim();
    if (!/^https?:\/\//i.test(resolved)) {
      state.updateActiveTab({ url: 'http://' + resolved });
    }

    try {
      const { finalUrl, ...resData } = await sendViaProxy(tab, state.environments);

      sandbox.attachResponse(resData.status, resData.statusText, resData.rawText);
      sandbox.runTests(tab.tests);

      state.updateActiveTab({
        response: { ...resData, testResults: sandbox.testResults },
        activeResTab: 'body',
      });
      state.addHistory({
        id: generateId(),
        method: tab.method,
        url: finalUrl,
        status: resData.status,
        time: resData.timeTaken,
        date: new Date().toISOString(),
      });
    } catch (error) {
      state.updateActiveTab({
        response: {
          ok: false,
          status: 0,
          statusText: 'Proxy Error',
          timeTaken: 0,
          size: 0,
          rawText: (error as Error).message,
          headers: {},
          testResults: [],
        },
        activeResTab: 'body',
      });
    } finally {
      state.setIsLoading(false);
    }
  }, []);
}
