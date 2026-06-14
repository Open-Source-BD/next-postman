'use client';
import { useState } from 'react';

interface CodeViewProps {
  /** Raw text (used for line count + copy). */
  text: string;
  /** Optional pre-highlighted HTML to render instead of plain text. */
  html?: string;
}

export function CodeView({ text, html }: CodeViewProps) {
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
          <pre className="code-body" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="code-body">{text}</pre>
        )}
      </div>
    </div>
  );
}
