'use client';
import { useEffect } from 'react';
import { useApiStore } from './useApiStore';

const K_HISTORY = 'next-postman-history';
const K_COLLECTIONS = 'next-postman-collections';
const K_ENV = 'next-postman-environments';

/**
 * Hydrates the store from localStorage on mount, then subscribes to persist
 * history / collections / environments whenever they change. Hydration flips
 * the store's `hydrated` flag (read by the UI) — kept out of React state so we
 * don't call setState directly inside the effect.
 */
export function usePersistence(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      useApiStore.getState().hydrate({
        history: JSON.parse(localStorage.getItem(K_HISTORY) || '[]'),
        collections: JSON.parse(localStorage.getItem(K_COLLECTIONS) || '[]'),
        environments: JSON.parse(localStorage.getItem(K_ENV) || '[]'),
      });
    } catch {
      // corrupt storage → start clean (still mark hydrated)
      useApiStore.getState().hydrate({});
    }

    const unsub = useApiStore.subscribe((state, prev) => {
      if (state.history !== prev.history) {
        localStorage.setItem(K_HISTORY, JSON.stringify(state.history));
      }
      if (state.collections !== prev.collections) {
        localStorage.setItem(K_COLLECTIONS, JSON.stringify(state.collections));
      }
      if (state.environments !== prev.environments) {
        localStorage.setItem(K_ENV, JSON.stringify(state.environments));
      }
    });

    return unsub;
  }, []);
}
