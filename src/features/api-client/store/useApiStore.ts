import { create } from 'zustand';
import type {
  Collection,
  EnvVar,
  HistoryItem,
  SidebarTab,
  TabState,
  CodeLang,
} from '../types';
import { generateId } from '../lib/id';

export function createDefaultTab(): TabState {
  return {
    id: generateId(),
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: { type: 'none', bearer: '', basicUser: '', basicPass: '' },
    body: { type: 'none', formdata: [], urlencoded: [], rawContent: '', rawType: 'application/json' },
    scripts: '',
    tests: '',
    response: null,
    activeSubTab: 'params',
    activeResTab: 'body',
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

interface ApiState {
  // Hydration
  hydrated: boolean;
  // Tabs
  tabs: TabState[];
  activeTabId: string;
  // Data
  history: HistoryItem[];
  collections: Collection[];
  environments: EnvVar[];
  // UI
  activeSidebarTab: SidebarTab;
  isLoading: boolean;
  isEnvModalOpen: boolean;
  isSaveModalOpen: boolean;
  isCodeModalOpen: boolean;
  saveReqName: string;
  codeLang: CodeLang;
  codeSnippet: string;
  copied: boolean;

  // Actions
  newTab: (req?: TabState) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveTab: (updates: Partial<TabState>) => void;
  addHistory: (item: HistoryItem) => void;
  saveToCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  setEnvironments: (env: EnvVar[]) => void;
  setEnvVar: (key: string, value: string) => void;
  mergeImport: (collections: Collection[], environments: EnvVar[]) => void;
  hydrate: (data: Partial<Pick<ApiState, 'history' | 'collections' | 'environments'>>) => void;

  setActiveSidebarTab: (tab: SidebarTab) => void;
  setIsLoading: (v: boolean) => void;
  setEnvModalOpen: (v: boolean) => void;
  setSaveModalOpen: (v: boolean) => void;
  setCodeModalOpen: (v: boolean) => void;
  setSaveReqName: (v: string) => void;
  setCodeLang: (v: CodeLang) => void;
  setCodeSnippet: (v: string) => void;
  setCopied: (v: boolean) => void;
}

const initialTab = createDefaultTab();

export const useApiStore = create<ApiState>((set, get) => ({
  hydrated: false,
  tabs: [initialTab],
  activeTabId: initialTab.id,
  history: [],
  collections: [],
  environments: [],

  activeSidebarTab: 'history',
  isLoading: false,
  isEnvModalOpen: false,
  isSaveModalOpen: false,
  isCodeModalOpen: false,
  saveReqName: '',
  codeLang: 'curl',
  codeSnippet: '',
  copied: false,

  newTab: (req) => {
    const tab = req ? { ...clone(req), id: generateId(), response: null } : createDefaultTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      const fresh = createDefaultTab();
      set({ tabs: [fresh], activeTabId: fresh.id });
      return;
    }
    const idx = tabs.findIndex((t) => t.id === id);
    let nextActive = activeTabId;
    if (id === activeTabId) {
      nextActive = idx > 0 ? tabs[idx - 1].id : tabs[idx + 1].id;
    }
    set({ tabs: tabs.filter((t) => t.id !== id), activeTabId: nextActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateActiveTab: (updates) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, ...updates } : t)),
    })),

  addHistory: (item) => set((s) => ({ history: [item, ...s.history].slice(0, 50) })),

  saveToCollection: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { tabs, activeTabId } = get();
    const active = tabs.find((t) => t.id === activeTabId);
    if (!active) return;
    const request = clone(active);
    request.response = null;
    set((s) => ({
      collections: [
        { id: generateId(), name: trimmed, request, date: new Date().toISOString() },
        ...s.collections,
      ],
      isSaveModalOpen: false,
    }));
  },

  deleteCollection: (id) =>
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

  setEnvironments: (environments) => set({ environments }),

  setEnvVar: (key, value) =>
    set((s) => {
      const exists = s.environments.find((p) => p.key === key);
      if (exists) {
        return { environments: s.environments.map((p) => (p.key === key ? { ...p, value } : p)) };
      }
      return { environments: [...s.environments, { id: generateId(), key, value }] };
    }),

  mergeImport: (collections, environments) =>
    set((s) => ({
      collections: [...collections, ...s.collections],
      environments: [...environments, ...s.environments],
    })),

  hydrate: (data) =>
    set({
      history: data.history ?? [],
      collections: data.collections ?? [],
      environments: Array.isArray(data.environments) ? data.environments : [],
      hydrated: true,
    }),

  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setEnvModalOpen: (isEnvModalOpen) => set({ isEnvModalOpen }),
  setSaveModalOpen: (isSaveModalOpen) => set({ isSaveModalOpen }),
  setCodeModalOpen: (isCodeModalOpen) => set({ isCodeModalOpen }),
  setSaveReqName: (saveReqName) => set({ saveReqName }),
  setCodeLang: (codeLang) => set({ codeLang }),
  setCodeSnippet: (codeSnippet) => set({ codeSnippet }),
  setCopied: (copied) => set({ copied }),
}));

/** Selector helper: the currently active tab (falls back to first). */
export const selectActiveTab = (s: ApiState): TabState =>
  s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
