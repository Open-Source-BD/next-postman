'use client';
import { createDefaultTab, useApiStore } from '../store/useApiStore';

interface SidebarProps {
  triggerImport: () => void;
  onExport: () => void;
}

export function Sidebar({ triggerImport, onExport }: SidebarProps) {
  const history = useApiStore((s) => s.history);
  const collections = useApiStore((s) => s.collections);
  const activeSidebarTab = useApiStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useApiStore((s) => s.setActiveSidebarTab);
  const newTab = useApiStore((s) => s.newTab);
  const deleteCollection = useApiStore((s) => s.deleteCollection);

  return (
    <aside className="sidebar md-surface">
      <div className="sidebar-tabs md-surface-container">
        <button
          className={`sidebar-tab ${activeSidebarTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSidebarTab('history')}
        >
          History
        </button>
        <button
          className={`sidebar-tab ${activeSidebarTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveSidebarTab('collections')}
        >
          Collections
        </button>
      </div>
      <div className="sidebar-actions md-surface-container-low">
        <button className="md-icon-btn" onClick={triggerImport} title="Import JSON (Cmd+I)">
          <span className="material-symbols-outlined">download</span> Import
        </button>
        <button className="md-icon-btn" onClick={onExport} title="Export JSON (Cmd+E)">
          <span className="material-symbols-outlined">upload</span> Export
        </button>
      </div>
      <div className="sidebar-content">
        {activeSidebarTab === 'history' &&
          history.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => newTab({ ...createDefaultTab(), method: item.method, url: item.url })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`history-method ${item.method.toLowerCase()}`}>{item.method}</span>
                <span className="history-time">
                  {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="history-url">{item.url}</div>
            </div>
          ))}
        {activeSidebarTab === 'collections' &&
          collections.map((item) => (
            <div
              key={item.id}
              className="collection-item"
              style={{ position: 'relative' }}
              onClick={() => newTab(item.request)}
            >
              <div className="collection-name">{item.name}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`collection-method ${item.request.method.toLowerCase()}`}>
                  {item.request.method}
                </span>
                <span className="collection-url">{item.request.url}</span>
              </div>
              <button
                className="md-icon-btn-small danger"
                style={{ position: 'absolute', right: '8px', top: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollection(item.id);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  delete
                </span>
              </button>
            </div>
          ))}
      </div>
    </aside>
  );
}
