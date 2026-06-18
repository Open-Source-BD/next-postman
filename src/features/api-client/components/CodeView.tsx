'use client';
import { useState } from 'react';

interface CodeViewProps {
  /** Raw text (used for line count + copy). */
  text: string;
  /** Optional pre-highlighted HTML to render instead of plain text. */
  html?: string;
  /** Wrap long lines instead of scrolling horizontally (response Raw view). */
  wrap?: boolean;
}

export function CodeView({ text, html, wrap }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const lineCount = text ? text.split('\n').length : 1;

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-view">
      <button className="code-copy" onClick={copy} title="Copy">
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
      <div className="code-scroll">
        <div className="code-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {html !== undefined ? (
          <pre className={`code-body${wrap ? ' code-body-wrap' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className={`code-body${wrap ? ' code-body-wrap' : ''}`}>{text}</pre>
        )}
      </div>
    </div>
  );
}
