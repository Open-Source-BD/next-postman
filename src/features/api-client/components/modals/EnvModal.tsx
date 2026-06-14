'use client';
import { useApiStore } from '../../store/useApiStore';
import { KvEditor } from '../KvEditor';
import type { EnvVar } from '../../types';

export function EnvModal() {
  const isOpen = useApiStore((s) => s.isEnvModalOpen);
  const setOpen = useApiStore((s) => s.setEnvModalOpen);
  const environments = useApiStore((s) => s.environments);
  const setEnvironments = useApiStore((s) => s.setEnvironments);

  if (!isOpen) return null;

  return (
    <div
      className="md-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="md-modal">
        <div className="md-modal-header">
          <h3>Environment Variables</h3>
          <button className="md-icon-btn-small" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="md-modal-body">
          <KvEditor items={environments} onChange={(items) => setEnvironments(items as EnvVar[])} />
        </div>
      </div>
    </div>
  );
}
