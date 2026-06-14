'use client';
import type { BodyType, RawType } from '../../types';
import { selectActiveTab, useApiStore } from '../../store/useApiStore';
import { KvEditor } from '../KvEditor';

const BODY_TYPES: BodyType[] = ['none', 'formdata', 'urlencoded', 'raw'];

export function BodyTab() {
  const tab = useApiStore(selectActiveTab);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  const { body } = tab;

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
        {BODY_TYPES.map((t) => (
          <label key={t} className="md-radio">
            <input
              type="radio"
              name={`body-type-${tab.id}`}
              value={t}
              checked={body.type === t}
              onChange={() => updateActiveTab({ body: { ...body, type: t } })}
            />{' '}
            <span>{t}</span>
          </label>
        ))}
        {body.type === 'raw' && (
          <select
            className="md-select"
            value={body.rawType}
            onChange={(e) => updateActiveTab({ body: { ...body, rawType: e.target.value as RawType } })}
            style={{ marginLeft: '12px', padding: '4px 8px', fontSize: '13px' }}
          >
            <option value="application/json">JSON</option>
            <option value="text/plain">Text</option>
            <option value="application/xml">XML</option>
            <option value="text/html">HTML</option>
          </select>
        )}
      </div>

      {body.type === 'none' && (
        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', padding: '16px' }}>
          This request does not have a body.
        </div>
      )}
      {body.type === 'formdata' && (
        <KvEditor
          items={body.formdata}
          allowFile
          onChange={(formdata) => updateActiveTab({ body: { ...body, formdata } })}
        />
      )}
      {body.type === 'urlencoded' && (
        <KvEditor
          items={body.urlencoded}
          onChange={(urlencoded) => updateActiveTab({ body: { ...body, urlencoded } })}
        />
      )}
      {body.type === 'raw' && (
        <textarea
          className="md-textarea body-textarea"
          value={body.rawContent}
          onChange={(e) => updateActiveTab({ body: { ...body, rawContent: e.target.value } })}
          spellCheck="false"
          placeholder="Enter request body here..."
        />
      )}
    </>
  );
}
