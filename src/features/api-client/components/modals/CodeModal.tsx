'use client';
import { useApiStore } from '../../store/useApiStore';

export function CodeModal() {
  const isOpen = useApiStore((s) => s.isCodeModalOpen);
  const setOpen = useApiStore((s) => s.setCodeModalOpen);
  const codeSnippet = useApiStore((s) => s.codeSnippet);
  const copied = useApiStore((s) => s.copied);
  const setCopied = useApiStore((s) => s.setCopied);

  if (!isOpen) return null;

  const copy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="md-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="md-modal" style={{ maxWidth: '700px', width: '95%' }}>
        <div className="md-modal-header">
          <h3>Generate Code</h3>
          <button className="md-icon-btn-small" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="md-modal-body">
          <div style={{ position: 'relative' }}>
            <pre
              className="response-pre"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderRadius: '8px',
                overflowX: 'auto',
              }}
            >
              {codeSnippet}
            </pre>
            <button
              className="md-tonal-btn"
              onClick={copy}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                height: '32px',
                minWidth: 'unset',
                padding: '4px 12px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>
                {copied ? 'check' : 'content_copy'}
              </span>{' '}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
