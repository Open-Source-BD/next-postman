'use client';
import React from 'react';
import type { ResponseSubTab } from '../types';
import { selectActiveTab, useApiStore } from '../store/useApiStore';
import { formatSize } from '../lib/format';
import { syntaxHighlight } from '../lib/syntaxHighlight';

const RES_TABS: ResponseSubTab[] = ['body', 'headers'];

function renderBody(rawText: string): string {
  if (rawText.startsWith('{') || rawText.startsWith('[')) return syntaxHighlight(rawText);
  return rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function ResponsePane() {
  const tab = useApiStore(selectActiveTab);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  const res = tab.response;

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
        {RES_TABS.map((t) => (
          <button
            key={t}
            className={`md-tab-btn ${tab.activeResTab === t ? 'active' : ''}`}
            onClick={() => updateActiveTab({ activeResTab: t })}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
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
            <div
              className={`md-tab-content ${tab.activeResTab === 'body' ? 'active' : ''}`}
              style={{ padding: 0, minHeight: 'unset' }}
            >
              <pre className="response-pre" dangerouslySetInnerHTML={{ __html: renderBody(res.rawText) }} />
            </div>

            <div
              className={`md-tab-content ${tab.activeResTab === 'headers' ? 'active' : ''}`}
              style={{ padding: 0, minHeight: 'unset' }}
            >
              <div className="res-headers-grid">
                {Object.keys(res.headers).map((k) => (
                  <React.Fragment key={k}>
                    <div className="header-key">{k}</div>
                    <div className="header-value">{res.headers[k]}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className={`md-tab-content ${tab.activeResTab === 'testresults' ? 'active' : ''}`}>
              <div style={{ marginBottom: '16px', fontWeight: 500 }}>
                Tests: {res.testResults.filter((t) => t.pass).length}/{res.testResults.length} passed
              </div>
              {res.testResults.map((test, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: test.pass ? 'var(--success)' : 'var(--md-sys-color-error)',
                      fontSize: '18px',
                    }}
                  >
                    {test.pass ? 'check_circle' : 'cancel'}
                  </span>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        color: test.pass ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-error)',
                      }}
                    >
                      {test.name}
                    </div>
                    {!test.pass && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--md-sys-color-on-surface-variant)',
                          fontFamily: 'var(--mono-font)',
                          marginTop: '4px',
                        }}
                      >
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
