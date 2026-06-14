'use client';
import React, { useMemo, useState } from 'react';
import { selectActiveTab, useApiStore } from '../store/useApiStore';
import { formatSize } from '../lib/format';
import { syntaxHighlight } from '../lib/syntaxHighlight';
import { generateTypes, TYPE_LANGS, type TypeLang } from '../lib/jsonToTypes';
import { CodeView } from './CodeView';
import { JsonTree } from './JsonTree';

export function ResponsePane() {
  const tab = useApiStore(selectActiveTab);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  const res = tab.response;
  const [typeLang, setTypeLang] = useState<TypeLang>('typescript');

  const parsed = useMemo<unknown>(() => {
    if (!res) return undefined;
    try {
      return JSON.parse(res.rawText);
    } catch {
      return undefined;
    }
  }, [res]);

  const isJson = parsed !== undefined && typeof parsed === 'object' && parsed !== null;
  const prettyText = isJson ? JSON.stringify(parsed, null, 2) : res?.rawText ?? '';
  const bodyHtml = isJson
    ? syntaxHighlight(prettyText)
    : (res?.rawText ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const typesCode = useMemo(
    () => (isJson ? generateTypes(parsed, typeLang) : ''),
    [isJson, parsed, typeLang]
  );

  return (
    <section className="response-pane md-surface-container-lowest">
      <div className="response-header md-surface">
        <div
          className="status-badge"
          style={{ color: res ? (res.ok ? 'var(--success)' : 'var(--md-sys-color-error)') : '' }}
        >
          <span className="material-symbols-outlined status-icon">
            {res ? (res.ok ? 'check_circle' : 'error') : 'info'}
          </span>
          <span>{res ? `${res.status} ${res.statusText}` : 'Waiting for request...'}</span>
        </div>
        <div className="metrics">
          <div>
            Time: <span className="value">{res?.timeTaken || '-'}</span> ms
          </div>
          <div>
            Size: <span className="value">{res ? formatSize(res.size) : '-'}</span>
          </div>
        </div>
      </div>

      <div className="md-tabs-header">
        {(['body', 'headers'] as const).map((t) => (
          <button
            key={t}
            className={`md-tab-btn ${tab.activeResTab === t ? 'active' : ''}`}
            onClick={() => updateActiveTab({ activeResTab: t })}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {isJson && (
          <button
            className={`md-tab-btn ${tab.activeResTab === 'types' ? 'active' : ''}`}
            onClick={() => updateActiveTab({ activeResTab: 'types' })}
          >
            Types
          </button>
        )}
        {res?.testResults && res.testResults.length > 0 && (
          <button
            className={`md-tab-btn ${tab.activeResTab === 'testresults' ? 'active' : ''}`}
            onClick={() => updateActiveTab({ activeResTab: 'testresults' })}
          >
            Test Results
          </button>
        )}
      </div>

      <div className="response-content">
        {!res && (
          <div className="empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>
              cloud_download
            </span>
            <span>Enter URL and click Send to get a response</span>
          </div>
        )}

        {res && (
          <>
            <div className={`md-tab-content ${tab.activeResTab === 'body' ? 'active' : ''}`} style={{ padding: 0, minHeight: 'unset' }}>
              {isJson ? <JsonTree data={parsed} rawText={prettyText} /> : <CodeView text={prettyText} html={bodyHtml} />}
            </div>

            <div className={`md-tab-content ${tab.activeResTab === 'headers' ? 'active' : ''}`} style={{ padding: 0, minHeight: 'unset' }}>
              <div className="res-headers-grid">
                {Object.keys(res.headers).map((k) => (
                  <React.Fragment key={k}>
                    <div className="header-key">{k}</div>
                    <div className="header-value">{res.headers[k]}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {isJson && (
              <div className={`md-tab-content ${tab.activeResTab === 'types' ? 'active' : ''}`} style={{ padding: 0, minHeight: 'unset' }}>
                <div className="types-bar">
                  {TYPE_LANGS.map((l) => (
                    <button
                      key={l.id}
                      className={`types-lang-btn ${typeLang === l.id ? 'active' : ''}`}
                      onClick={() => setTypeLang(l.id)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <CodeView text={typesCode} />
              </div>
            )}

            <div className={`md-tab-content ${tab.activeResTab === 'testresults' ? 'active' : ''}`}>
              <div style={{ marginBottom: '16px', fontWeight: 500 }}>
                Tests: {res.testResults.filter((t) => t.pass).length}/{res.testResults.length} passed
              </div>
              {res.testResults.map((test, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: test.pass ? 'var(--success)' : 'var(--md-sys-color-error)', fontSize: '18px' }}
                  >
                    {test.pass ? 'check_circle' : 'cancel'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, color: test.pass ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-error)' }}>
                      {test.name}
                    </div>
                    {!test.pass && (
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'var(--mono-font)', marginTop: '4px' }}>
                        {test.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
