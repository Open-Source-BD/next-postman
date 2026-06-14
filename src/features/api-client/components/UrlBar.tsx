'use client';
import type { HttpMethod } from '../types';
import { selectActiveTab, useApiStore } from '../store/useApiStore';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

interface UrlBarProps {
  send: () => void;
}

export function UrlBar({ send }: UrlBarProps) {
  const tab = useApiStore(selectActiveTab);
  const isLoading = useApiStore((s) => s.isLoading);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  const saveActiveRequest = useApiStore((s) => s.saveActiveRequest);
  const saveActiveRequestAs = useApiStore((s) => s.saveActiveRequestAs);
  const isSaved = useApiStore((s) => !!selectActiveTab(s).sourceNodeId);
  const setCodeModalOpen = useApiStore((s) => s.setCodeModalOpen);

  const openCode = () => setCodeModalOpen(true);

  return (
    <div className="url-bar-container">
      <select
        className="md-select method-select"
        value={tab.method}
        onChange={(e) => updateActiveTab({ method: e.target.value as HttpMethod })}
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        className="md-input url-input"
        value={tab.url}
        onChange={(e) => updateActiveTab({ url: e.target.value })}
        placeholder="https://api.example.com/v1/users/{{userId}}"
        spellCheck="false"
      />
      <button
        className="md-filled-btn send-btn"
        onClick={send}
        disabled={isLoading}
        title="Send Request (Cmd+Enter)"
      >
        <span className="material-symbols-outlined">{isLoading ? 'hourglass_empty' : 'send'}</span>{' '}
        {isLoading ? 'Sending' : 'Send'}
      </button>
      <button className="md-tonal-btn save-btn" onClick={saveActiveRequest} title="Save Request (Cmd+S)">
        <span className="material-symbols-outlined">save</span> Save
      </button>
      {isSaved && (
        <button className="md-tonal-btn save-btn" onClick={saveActiveRequestAs} title="Save As new request">
          <span className="material-symbols-outlined">save_as</span> Save As
        </button>
      )}
      <button className="md-tonal-btn save-btn" onClick={openCode} title="Generate Code">
        <span className="material-symbols-outlined">code</span> Code
      </button>
    </div>
  );
}
