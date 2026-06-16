'use client';
import { useEffect, useRef, useState } from 'react';
import { useApiStore } from './store/useApiStore';
import { usePersistence } from './store/persist';
import { useRequestRunner } from './hooks/useRequestRunner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportData, parseImportFile } from './lib/importExport';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RequestTabsBar } from './components/RequestTabsBar';
import { RequestPane } from './components/RequestPane';
import { ResponsePane } from './components/ResponsePane';
import { PaneResizer } from './components/PaneResizer';
import { EnvModal } from './components/modals/EnvModal';
import { SaveModal } from './components/modals/SaveModal';
import { CodeModal } from './components/modals/CodeModal';
import { MoveToModal } from './components/modals/MoveToModal';
import { CurlModal } from './components/modals/CurlModal';
import { CloseTabModal } from './components/modals/CloseTabModal';
import { ResponseModal } from './components/modals/ResponseModal';

export function ApiClient() {
  usePersistence();
  const hydrated = useApiStore((s) => s.hydrated);
  const theme = useApiStore((s) => s.theme);
  const send = useRequestRunner();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const [requestHeight, setRequestHeight] = useState(340);

  const resizeRequestPane = (clientY: number) => {
    const top = splitRef.current?.getBoundingClientRect().top ?? 0;
    const total = splitRef.current?.clientHeight ?? 0;
    const next = Math.max(120, Math.min(clientY - top, total - 160));
    setRequestHeight(next);
  };
  // Expand response → request small. Collapse response → request large.
  const expandResponse = () => setRequestHeight(140);
  const collapseResponse = () =>
    setRequestHeight(Math.max(140, (splitRef.current?.clientHeight ?? 600) - 120));

  const triggerImport = () => fileInputRef.current?.click();
  const onExport = () => {
    const { collections, environments, globals } = useApiStore.getState();
    exportData(collections, environments, globals);
  };

  useKeyboardShortcuts({ send, triggerImport });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { collections, environments } = await parseImportFile(file);
      useApiStore.getState().mergeImport(collections, environments);
      alert('Import successful!');
    } catch {
      alert('Invalid JSON file.');
    }
    e.target.value = '';
  };

  // Match the prior SSR-safe mount guard: render nothing meaningful until
  // localStorage has hydrated to avoid a hydration mismatch.
  if (!hydrated) {
    return <div style={{ height: '100vh', background: 'var(--md-sys-color-background)' }} />;
  }

  return (
    <div id="app">
      <Sidebar triggerImport={triggerImport} onExport={onExport} />
      <main className="main-area">
        <TopBar />
        <RequestTabsBar />
        <div className="pane-split" ref={splitRef}>
          <div className="request-pane-wrap" style={{ height: requestHeight }}>
            <RequestPane send={send} />
          </div>
          <PaneResizer onDrag={resizeRequestPane} />
          <ResponsePane onExpand={expandResponse} onCollapse={collapseResponse} />
        </div>
      </main>

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <EnvModal />
      <SaveModal />
      <CodeModal />
      <MoveToModal />
      <CurlModal />
      <CloseTabModal />
      <ResponseModal />
    </div>
  );
}
