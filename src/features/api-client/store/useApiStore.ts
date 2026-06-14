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
import * as tree from '../lib/collectionTree';

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

interface ApiState {
  hydrated: boolean;
  tabs: TabState[];
  activeTabId: string;
  history: HistoryItem[];
  collections: Collection[];
  environments: EnvVar[];

  // UI
  activeSidebarTab: SidebarTab;
  isLoading: boolean;
  isEnvModalOpen: boolean;
  isSaveModalOpen: boolean;
  isCodeModalOpen: boolean;
  isMoveModalOpen: boolean;
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
  setEnvironments: (env: EnvVar[]) => void;
  setEnvVar: (key: string, value: string) => void;

  // Import / hydrate
  mergeImport: (collections: Collection[], environments: EnvVar[]) => void;
  hydrate: (data: Partial<Pick<ApiState, 'history' | 'collections' | 'environments'>>) => void;

  // UI setters
  toggleExpanded: (id: string) => void;
  setCollectionSearch: (v: string) => void;
  setHistorySearch: (v: string) => void;
  openMoveModal: (nodeId: string) => void;
  closeMoveModal: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setIsLoading: (v: boolean) => void;
  setEnvModalOpen: (v: boolean) => void;
  setSaveModalOpen: (v: boolean) => void;
  setCodeModalOpen: (v: boolean) => void;
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
  isMoveModalOpen: false,
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
    const req = item.request ?? { ...createDefaultTab(), method: item.method, url: item.url };
    get().newTab(req);
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

  setEnvironments: (environments) => set({ environments }),
  setEnvVar: (key, value) =>
    set((s) => {
      const exists = s.environments.find((p) => p.key === key);
      if (exists) return { environments: s.environments.map((p) => (p.key === key ? { ...p, value } : p)) };
      return { environments: [...s.environments, { id: generateId(), key, value }] };
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
    const expanded: Record<string, boolean> = {};
    collections.forEach((c) => { expanded[c.id] = true; });
    set({
      history: data.history ?? [],
      collections,
      environments: Array.isArray(data.environments) ? data.environments : [],
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
  setSaveModalOpen: (isSaveModalOpen) => set({ isSaveModalOpen }),
  setCodeModalOpen: (isCodeModalOpen) => set({ isCodeModalOpen }),
  setCodeLang: (codeLang) => set({ codeLang }),
  setCodeSnippet: (codeSnippet) => set({ codeSnippet }),
  setCopied: (copied) => set({ copied }),
}));

/** Selector helper: the currently active tab (falls back to first). */
export const selectActiveTab = (s: ApiState): TabState =>
  s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
