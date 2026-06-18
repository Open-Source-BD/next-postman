'use client';
import { useState } from 'react';
import { useApiStore } from '../store/useApiStore';

/**
 * TopBar status chip for the git-native workspace. Always tells the user where
 * their data is and whether it's saving — the trust surface for "no lock-in".
 * Browsers drop folder permission on reload, so "reconnect" is a first-class state.
 */
export function WorkspaceChip() {
  const status = useApiStore((s) => s.workspaceStatus);
  const name = useApiStore((s) => s.workspaceName);
  const busy = useApiStore((s) => s.workspaceBusy);
  const error = useApiStore((s) => s.workspaceError);
  const connect = useApiStore((s) => s.connectWorkspace);
  const reconnect = useApiStore((s) => s.reconnectWorkspace);
  const save = useApiStore((s) => s.saveToWorkspace);
  const load = useApiStore((s) => s.loadFromWorkspace);
  const disconnect = useApiStore((s) => s.disconnectWorkspace);

  const [menuOpen, setMenuOpen] = useState(false);
  const icon = (n: string) => <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{n}</span>;

  if (status === 'unsupported') {
    return (
      <span className="ws-chip ws-muted" title="Local folder sync needs a Chromium browser (Chrome/Edge). Use Export/Import JSON elsewhere.">
        {icon('folder_off')} Folder: Chromium only
      </span>
    );
  }

  if (status === 'disconnected') {
    return (
      <button className="ws-chip" onClick={connect} disabled={busy} title="Save collections to a local folder you can commit to git" aria-label="Connect a local workspace folder">
        {icon('create_new_folder')} {busy ? 'Connecting…' : 'Connect folder'}
      </button>
    );
  }

  if (status === 'reconnect') {
    return (
      <button className="ws-chip ws-reconnect" onClick={reconnect} disabled={busy} title={error || 'Re-grant folder permission (browsers drop it on reload)'} aria-label={`Reconnect workspace folder ${name}`}>
        {icon('sync_problem')} <span aria-live="polite">{busy ? 'Reconnecting…' : `Reconnect ${name}`}</span>
      </button>
    );
  }

  // connected
  return (
    <div className="ws-chip-wrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false); }}>
      <button
        className="ws-chip ws-connected"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={busy}
        aria-expanded={menuOpen}
        aria-label={`Workspace folder ${name} connected`}
        title={error || `Connected to ${name}`}
      >
        {icon(error ? 'error' : 'folder_managed')}
        <span aria-live="polite">{busy ? 'Syncing…' : name}</span>
        {icon('expand_more')}
      </button>
      {menuOpen && (
        <div className="ws-menu" role="menu">
          <button role="menuitem" onClick={() => { setMenuOpen(false); save(); }}>{icon('save')} Save to folder</button>
          <button role="menuitem" onClick={() => { setMenuOpen(false); load(); }}>{icon('folder_open')} Load from folder</button>
          <button role="menuitem" className="ws-menu-danger" onClick={() => { setMenuOpen(false); disconnect(); }}>{icon('link_off')} Disconnect</button>
        </div>
      )}
    </div>
  );
}
