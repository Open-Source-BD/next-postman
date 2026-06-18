import { create } from 'zustand';
import type { Collection, EnvVar, Environment, HistoryItem, SidebarTab, TabState } from '../types';
import type { CodeLang } from '../lib/codegen';
import { generateId } from '../lib/id';
import * as tree from '../lib/collectionTree';
import { isTabDirty } from '../lib/tabDirty';
import { runCollection, type RunResultItem } from '../lib/collectionRunner';
import { parseData } from '../lib/parseData';

/** Live AbortController for an in-flight collection run (not serializable → not in state). */
let runAbort: AbortController | null = null;

/** Accept either the new Environment[] shape or a legacy flat EnvVar[]. */
function migrateEnvironments(raw: unknown): Environment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0] as Record<string, unknown>;
  if (first && Array.isArray(first.vars)) return raw as Environment[];
  // Legacy flat EnvVar[] → single "Default" environment.
  return [{ id: generateId(), name: 'Default', vars: raw as EnvVar[] }];
}

export function createDefaultTab(): TabState {
  return {
    id: generateId(),
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: {
      type: 'none',
      bearer: '',
      basicUser: '',
      basicPass: '',
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyIn: 'header',
      oauthToken: '',
      jwtToken: '',
      jwtPrefix: 'Bearer',
    },
    body: { type: 'none', formdata: [], urlencoded: [], rawContent: '', rawType: 'application/json' },
    scripts: '',
    tests: '',
    response: null,
    activeSubTab: 'params',
    activeResTab: 'body',
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Snapshot a tab as a storable request (no live response, no tab-source link). */
function snapshotRequest(tab: TabState): TabState {
  const snap = clone(tab);
  snap.response = null;
  snap.sourceNodeId = undefined;
  return snap;
}

export interface PendingSave {
  request: TabState;
  suggestedName: string;
  /** When true, saving links the active tab to the new node via sourceNodeId. */
  fromActiveTab: boolean;
}

type Theme = 'light' | 'dark';

interface ApiState {
  hydrated: boolean;
  theme: Theme;
  tabs: TabState[];
  activeTabId: string;
  history: HistoryItem[];
  collections: Collection[];
  environments: Environment[];
  activeEnvId: string | null;
  globals: EnvVar[];

  // UI
  activeSidebarTab: SidebarTab;
  isLoading: boolean;
  isEnvModalOpen: boolean;
  isSaveModalOpen: boolean;
  isCodeModalOpen: boolean;
  isMoveModalOpen: boolean;
  isCurlModalOpen: boolean;
  isResponseModalOpen: boolean;
  /** Collection Runner: target node id when the modal is open, else null. */
  runnerNodeId: string | null;
  runnerRunning: boolean;
  runnerProgress: { current: number; total: number };
  runnerResults: RunResultItem[];
  runnerError: string | null;
  /** Tab pending close-confirm (dirty). null = no modal. */
  closingTabId: string | null;
  moveNodeId: string | null;
  pendingSave: PendingSave | null;
  codeLang: CodeLang;
  codeSnippet: string;
  copied: boolean;
  expanded: Record<string, boolean>;
  collectionSearch: string;
  historySearch: string;

  // Tabs
  newTab: (req?: TabState) => void;
  closeTab: (id: string) => void;
  /** Close if clean; if dirty (unsaved edits to a saved node), open the close-confirm modal. */
  requestCloseTab: (id: string) => void;
  confirmCloseTab: () => void;
  saveAndCloseTab: () => void;
  cancelCloseTab: () => void;
  setActiveTab: (id: string) => void;
  updateActiveTab: (updates: Partial<TabState>) => void;

  // History
  addHistory: (item: HistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
  replayHistory: (item: HistoryItem) => void;

  // Collections — tree
  createCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  setCollectionDescription: (id: string, description: string) => void;
  deleteCollection: (id: string) => void;
  createFolder: (parentId: string, name: string) => void;
  addRequest: (parentId: string) => void;
  renameNode: (id: string, name: string) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  openRequestNode: (nodeId: string) => void;

  // Save flow
  saveActiveRequest: () => void;
  saveActiveRequestAs: () => void;
  openSaveModalForHistory: (item: HistoryItem) => void;
  confirmSave: (parentId: string, name: string) => void;
  cancelSave: () => void;

  // Environments
  createEnvironment: (name: string) => void;
  renameEnvironment: (id: string, name: string) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnv: (id: string | null) => void;
  setEnvVars: (envId: string, vars: EnvVar[]) => void;
  setGlobals: (vars: EnvVar[]) => void;
  setEnvVar: (key: string, value: string) => void;

  // Import / hydrate
  mergeImport: (collections: Collection[], environments: Environment[]) => void;
  hydrate: (data: {
    history?: HistoryItem[];
    collections?: unknown;
    environments?: unknown;
    activeEnvId?: string | null;
    globals?: EnvVar[];
    tabs?: TabState[];
    activeTabId?: string;
    theme?: Theme;
  }) => void;

  // UI setters
  toggleExpanded: (id: string) => void;
  setCollectionSearch: (v: string) => void;
  setHistorySearch: (v: string) => void;
  openMoveModal: (nodeId: string) => void;
  closeMoveModal: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setIsLoading: (v: boolean) => void;
  setEnvModalOpen: (v: boolean) => void;
  setCurlModalOpen: (v: boolean) => void;
  setResponseModalOpen: (v: boolean) => void;
  // Collection Runner
  openRunner: (nodeId: string) => void;
  closeRunner: () => void;
  startRun: (opts: { iterations: number; dataText: string }) => Promise<void>;
  cancelRun: () => void;
  setSaveModalOpen: (v: boolean) => void;
  setCodeModalOpen: (v: boolean) => void;
  setCodeLang: (v: CodeLang) => void;
  setCodeSnippet: (v: string) => void;
  setCopied: (v: boolean) => void;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const initialTab = createDefaultTab();

export const useApiStore = create<ApiState>((set, get) => ({
  hydrated: false,
  theme: 'light',
  tabs: [initialTab],
  activeTabId: initialTab.id,
  history: [],
  collections: [],
  environments: [],
  activeEnvId: null,
  globals: [],

  activeSidebarTab: 'history',
  isLoading: false,
  isEnvModalOpen: false,
  isSaveModalOpen: false,
  isCodeModalOpen: false,
  isMoveModalOpen: false,
  isCurlModalOpen: false,
  isResponseModalOpen: false,
  runnerNodeId: null,
  runnerRunning: false,
  runnerProgress: { current: 0, total: 0 },
  runnerResults: [],
  runnerError: null,
  closingTabId: null,
  moveNodeId: null,
  pendingSave: null,
  codeLang: 'curl',
  codeSnippet: '',
  copied: false,
  expanded: {},
  collectionSearch: '',
  historySearch: '',

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
    if (id === activeTabId) nextActive = idx > 0 ? tabs[idx - 1].id : tabs[idx + 1].id;
    set({ tabs: tabs.filter((t) => t.id !== id), activeTabId: nextActive });
  },

  requestCloseTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (tab && isTabDirty(tab, get().collections)) {
      set({ closingTabId: id });
      return;
    }
    get().closeTab(id);
  },

  confirmCloseTab: () => {
    const { closingTabId } = get();
    if (!closingTabId) return;
    set({ closingTabId: null });
    get().closeTab(closingTabId);
  },

  saveAndCloseTab: () => {
    const { closingTabId, collections } = get();
    if (!closingTabId) return;
    const tab = get().tabs.find((t) => t.id === closingTabId);
    set({ activeTabId: closingTabId });
    const savedNode = tab?.sourceNodeId && tree.findNode(collections, tab.sourceNodeId);
    if (savedNode) {
      // Existing saved request → write to node and close.
      get().saveActiveRequest();
      set({ closingTabId: null });
      get().closeTab(closingTabId);
    } else {
      // Unsaved request → open Save modal; keep tab open (close after naming/saving).
      set({ closingTabId: null });
      get().saveActiveRequest();
    }
  },

  cancelCloseTab: () => set({ closingTabId: null }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateActiveTab: (updates) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, ...updates } : t)),
    })),

  addHistory: (item) =>
    set((s) => ({
      history: [item, ...s.history.filter((h) => !(h.method === item.method && h.url === item.url))].slice(0, 50),
    })),
  deleteHistoryItem: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
  clearHistory: () => set({ history: [] }),
  replayHistory: (item) => {
    // Already replayed? Focus that tab instead of creating a duplicate.
    const existing = get().tabs.find((t) => t.sourceHistoryId === item.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const req = item.request ?? { ...createDefaultTab(), method: item.method, url: item.url };
    get().newTab(req);
    get().updateActiveTab({ sourceHistoryId: item.id });
  },

  // --- Collections ---

  createCollection: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const col: Collection = {
      id: generateId(),
      name: trimmed,
      children: [],
      date: new Date().toISOString(),
    };
    set((s) => ({ collections: [...s.collections, col], expanded: { ...s.expanded, [col.id]: true } }));
  },

  renameCollection: (id, name) =>
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    })),

  setCollectionDescription: (id, description) =>
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, description } : c)),
    })),

  deleteCollection: (id) => set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

  createFolder: (parentId, name) => {
    const folder = tree.makeFolder(name.trim() || 'New Folder');
    set((s) => ({
      collections: tree.insertNode(s.collections, parentId, folder),
      expanded: { ...s.expanded, [parentId]: true, [folder.id]: true },
    }));
  },

  addRequest: (parentId) => {
    const node = tree.makeRequest('New Request', createDefaultTab());
    set((s) => ({
      collections: tree.insertNode(s.collections, parentId, node),
      expanded: { ...s.expanded, [parentId]: true },
    }));
    get().openRequestNode(node.id);
  },

  renameNode: (id, name) => set((s) => ({ collections: tree.updateNode(s.collections, id, { name }) })),
  deleteNode: (id) => set((s) => ({ collections: tree.removeNode(s.collections, id) })),
  duplicateNode: (id) => set((s) => ({ collections: tree.duplicateNode(s.collections, id) })),

  moveNode: (nodeId, targetParentId, index) =>
    set((s) => ({
      collections: tree.moveNode(s.collections, nodeId, targetParentId, index),
      expanded: { ...s.expanded, [targetParentId]: true },
    })),

  openRequestNode: (nodeId) => {
    // Already open? Focus that tab instead of creating a duplicate.
    const existing = get().tabs.find((t) => t.sourceNodeId === nodeId);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const node = tree.findNode(get().collections, nodeId);
    if (!node || node.type !== 'request') return;
    get().newTab(node.request);
    get().updateActiveTab({ sourceNodeId: nodeId });
  },

  // --- Save flow ---

  saveActiveRequest: () => {
    const { tabs, activeTabId, collections } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    if (tab.sourceNodeId && tree.findNode(collections, tab.sourceNodeId)) {
      set({ collections: tree.updateNode(collections, tab.sourceNodeId, { request: snapshotRequest(tab) }) });
      return;
    }
    set({
      pendingSave: { request: snapshotRequest(tab), suggestedName: tab.url || 'New Request', fromActiveTab: true },
      isSaveModalOpen: true,
    });
  },

  saveActiveRequestAs: () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    set({
      pendingSave: { request: snapshotRequest(tab), suggestedName: tab.url || 'New Request', fromActiveTab: true },
      isSaveModalOpen: true,
    });
  },

  openSaveModalForHistory: (item) => {
    const request = item.request ?? { ...createDefaultTab(), method: item.method, url: item.url };
    set({
      pendingSave: { request: snapshotRequest(request), suggestedName: item.url || 'New Request', fromActiveTab: false },
      isSaveModalOpen: true,
    });
  },

  confirmSave: (parentId, name) => {
    const { pendingSave, collections } = get();
    if (!pendingSave) return;
    const node = tree.makeRequest(name.trim() || 'New Request', clone(pendingSave.request));
    set((s) => ({
      collections: tree.insertNode(collections, parentId, node),
      expanded: { ...s.expanded, [parentId]: true },
      isSaveModalOpen: false,
      pendingSave: null,
    }));
    if (pendingSave.fromActiveTab) get().updateActiveTab({ sourceNodeId: node.id });
  },

  cancelSave: () => set({ isSaveModalOpen: false, pendingSave: null }),

  // --- Environments ---

  createEnvironment: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const env: Environment = { id: generateId(), name: trimmed, vars: [] };
    set((s) => ({ environments: [...s.environments, env], activeEnvId: env.id }));
  },

  renameEnvironment: (id, name) =>
    set((s) => ({ environments: s.environments.map((e) => (e.id === id ? { ...e, name } : e)) })),

  deleteEnvironment: (id) =>
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvId: s.activeEnvId === id ? null : s.activeEnvId,
    })),

  setActiveEnv: (activeEnvId) => set({ activeEnvId }),

  setEnvVars: (envId, vars) =>
    set((s) => ({ environments: s.environments.map((e) => (e.id === envId ? { ...e, vars } : e)) })),

  setGlobals: (globals) => set({ globals }),

  // Used by the pm sandbox — writes to the active env, else globals.
  setEnvVar: (key, value) =>
    set((s) => {
      const upsert = (vars: EnvVar[]) => {
        const exists = vars.find((p) => p.key === key);
        return exists
          ? vars.map((p) => (p.key === key ? { ...p, value } : p))
          : [...vars, { id: generateId(), key, value }];
      };
      const active = s.environments.find((e) => e.id === s.activeEnvId);
      if (active) {
        return { environments: s.environments.map((e) => (e.id === active.id ? { ...e, vars: upsert(e.vars) } : e)) };
      }
      return { globals: upsert(s.globals) };
    }),

  mergeImport: (collections, environments) =>
    set((s) => {
      const expanded = { ...s.expanded };
      collections.forEach((c) => { expanded[c.id] = true; });
      return {
        collections: [...collections, ...s.collections],
        environments: [...environments, ...s.environments],
        expanded,
      };
    }),

  hydrate: (data) => {
    const collections = tree.migrateCollections(data.collections ?? []);
    const environments = migrateEnvironments(data.environments);
    const expanded: Record<string, boolean> = {};
    collections.forEach((c) => { expanded[c.id] = true; });

    const tabs = data.tabs && data.tabs.length ? data.tabs : [createDefaultTab()];
    const activeTabId = data.activeTabId && tabs.some((t) => t.id === data.activeTabId)
      ? data.activeTabId
      : tabs[0].id;

    set({
      history: data.history ?? [],
      collections,
      environments,
      activeEnvId: data.activeEnvId ?? environments[0]?.id ?? null,
      globals: Array.isArray(data.globals) ? data.globals : [],
      tabs,
      activeTabId,
      theme: data.theme === 'dark' ? 'dark' : 'light',
      expanded,
      hydrated: true,
    });
  },

  // --- UI ---

  toggleExpanded: (id) => set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
  setCollectionSearch: (collectionSearch) => set({ collectionSearch }),
  setHistorySearch: (historySearch) => set({ historySearch }),
  openMoveModal: (moveNodeId) => set({ moveNodeId, isMoveModalOpen: true }),
  closeMoveModal: () => set({ isMoveModalOpen: false, moveNodeId: null }),
  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setEnvModalOpen: (isEnvModalOpen) => set({ isEnvModalOpen }),
  setCurlModalOpen: (isCurlModalOpen) => set({ isCurlModalOpen }),
  setResponseModalOpen: (isResponseModalOpen) => set({ isResponseModalOpen }),

  // --- Collection Runner ---

  openRunner: (runnerNodeId) =>
    set({ runnerNodeId, runnerRunning: false, runnerResults: [], runnerProgress: { current: 0, total: 0 }, runnerError: null }),

  closeRunner: () => {
    runAbort?.abort();
    runAbort = null;
    set({ runnerNodeId: null, runnerRunning: false });
  },

  startRun: async ({ iterations, dataText }) => {
    const state = get();
    const nodeId = state.runnerNodeId;
    if (!nodeId || state.runnerRunning) return;

    const requests = tree.listRequests(state.collections, nodeId);
    if (requests.length === 0) {
      set({ runnerError: null, runnerResults: [], runnerProgress: { current: 0, total: 0 } });
      return;
    }

    let dataRows: Record<string, string>[] = [];
    if (dataText.trim()) {
      try {
        dataRows = parseData(dataText);
      } catch (e) {
        set({ runnerError: (e as Error).message });
        return;
      }
    }

    const seedVars = selectActiveVars(state);
    runAbort = new AbortController();
    set({ runnerRunning: true, runnerResults: [], runnerProgress: { current: 0, total: 0 }, runnerError: null });

    await runCollection({
      requests,
      seedVars,
      iterations,
      dataRows,
      signal: runAbort.signal,
      onResult: (item) => set((s) => ({ runnerResults: [...s.runnerResults, item] })),
      onProgress: (current, total) => set({ runnerProgress: { current, total } }),
    });

    runAbort = null;
    set({ runnerRunning: false });
  },

  cancelRun: () => {
    runAbort?.abort();
    runAbort = null;
    set({ runnerRunning: false });
  },

  setSaveModalOpen: (isSaveModalOpen) => set({ isSaveModalOpen }),
  setCodeModalOpen: (isCodeModalOpen) => set({ isCodeModalOpen }),
  setCodeLang: (codeLang) => set({ codeLang }),
  setCodeSnippet: (codeSnippet) => set({ codeSnippet }),
  setCopied: (copied) => set({ copied }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
}));

/** Selector helper: the currently active tab (falls back to first). */
export const selectActiveTab = (s: ApiState): TabState =>
  s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];

/** Resolved variable list for the active env: globals first, active env overrides. */
export const selectActiveVars = (s: ApiState): EnvVar[] => {
  const active = s.environments.find((e) => e.id === s.activeEnvId);
  return [...s.globals, ...(active?.vars ?? [])];
};
