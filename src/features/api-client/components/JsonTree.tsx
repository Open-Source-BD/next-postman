'use client';
import { useState } from 'react';

interface JsonTreeProps {
  data: unknown;
  /** Pretty-printed text for the copy button. */
  rawText: string;
}

export function JsonTree({ data, rawText }: JsonTreeProps) {
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const setAll = (open: boolean) => {
    setDefaultOpen(open);
    setVersion((v) => v + 1);
  };

  return (
    <div className="json-tree-view">
      <div className="jt-toolbar">
        <button className="jt-tool-btn" onClick={() => setAll(true)} title="Expand all">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_more</span> Expand
        </button>
        <button className="jt-tool-btn" onClick={() => setAll(false)} title="Collapse all">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_less</span> Collapse
        </button>
        <button className="jt-tool-btn jt-copy" onClick={copy} title="Copy">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{copied ? 'check' : 'content_copy'}</span>
        </button>
      </div>
      <div className="jt-scroll">
        <JsonNode key={version} keyName={undefined} value={data} depth={0} isLast defaultOpen={defaultOpen} />
      </div>
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === 'string') return <span className="json-string">&quot;{value}&quot;</span>;
  if (typeof value === 'boolean') return <span className="json-boolean">{String(value)}</span>;
  return <span className="json-number">{String(value)}</span>;
}

interface NodeProps {
  keyName: string | undefined;
  value: unknown;
  depth: number;
  isLast: boolean;
  defaultOpen: boolean;
}

function JsonNode({ keyName, value, depth, isLast, defaultOpen }: NodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pad = { paddingLeft: depth * 16 + 8 };
  const isContainer = value !== null && typeof value === 'object';

  const keyLabel =
    keyName !== undefined ? (
      <>
        <span className="json-key">&quot;{keyName}&quot;</span>
        <span className="jt-colon">: </span>
      </>
    ) : null;

  if (!isContainer) {
    return (
      <div className="jt-row" style={pad}>
        <span className="jt-spacer" />
        {keyLabel}
        <Primitive value={value} />
        {!isLast && <span>,</span>}
      </div>
    );
  }

  const isArr = Array.isArray(value);
  const entries: [string, unknown][] = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const ob = isArr ? '[' : '{';
  const cb = isArr ? ']' : '}';

  return (
    <>
      <div className="jt-row jt-branch" style={pad} onClick={() => setOpen((o) => !o)}>
        <span className="jt-toggle material-symbols-outlined">{open ? 'expand_more' : 'chevron_right'}</span>
        {keyLabel}
        <span className="jt-bracket">{ob}</span>
        {!open && (
          <span className="jt-collapsed">
            … {entries.length} {isArr ? 'items' : 'keys'} {cb}
            {!isLast && ','}
          </span>
        )}
      </div>
      {open &&
        entries.map(([ck, cv], i) => (
          <JsonNode
            key={ck}
            keyName={isArr ? undefined : ck}
            value={cv}
            depth={depth + 1}
            isLast={i === entries.length - 1}
            defaultOpen={defaultOpen}
          />
        ))}
      {open && (
        <div className="jt-row" style={pad}>
          <span className="jt-spacer" />
          <span className="jt-bracket">{cb}</span>
          {!isLast && <span>,</span>}
        </div>
      )}
    </>
  );
}
