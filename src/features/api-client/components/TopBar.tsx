'use client';
import { useApiStore } from '../store/useApiStore';

export function TopBar() {
  const setEnvModalOpen = useApiStore((s) => s.setEnvModalOpen);
  return (
    <div className="top-bar md-surface-container-low">
      <div className="logo">
        <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)' }}>
          api
        </span>
        <span>API Client</span>
      </div>
      <button
        className="md-tonal-btn env-btn"
        onClick={() => setEnvModalOpen(true)}
        title="Environments (Cmd+Shift+E)"
      >
        <span className="material-symbols-outlined">settings</span> Environments
      </button>
    </div>
  );
}
