'use client';
import { useApiStore } from '../../store/useApiStore';

export function SaveModal() {
  const isOpen = useApiStore((s) => s.isSaveModalOpen);
  const setOpen = useApiStore((s) => s.setSaveModalOpen);
  const saveReqName = useApiStore((s) => s.saveReqName);
  const setSaveReqName = useApiStore((s) => s.setSaveReqName);
  const saveToCollection = useApiStore((s) => s.saveToCollection);

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
          <h3>Save Request</h3>
          <button className="md-icon-btn-small" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="md-modal-body">
          <input
            className="md-input"
            autoFocus
            placeholder="Request Name (e.g. Get Users)"
            value={saveReqName}
            onChange={(e) => setSaveReqName(e.target.value)}
            style={{ width: '100%', marginBottom: '24px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="md-tonal-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="md-filled-btn" onClick={() => saveToCollection(saveReqName)}>
              Save to Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
