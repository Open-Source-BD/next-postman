'use client';
import type { AuthType } from '../../types';
import { selectActiveTab, useApiStore } from '../../store/useApiStore';

export function AuthTab() {
  const tab = useApiStore(selectActiveTab);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  const { auth } = tab;

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Type:</span>
        <select
          className="md-select"
          value={auth.type}
          onChange={(e) => updateActiveTab({ auth: { ...auth, type: e.target.value as AuthType } })}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
        </select>
      </div>
      {auth.type === 'bearer' && (
        <input
          className="md-input"
          placeholder="Token"
          value={auth.bearer}
          onChange={(e) => updateActiveTab({ auth: { ...auth, bearer: e.target.value } })}
          style={{ maxWidth: '400px' }}
        />
      )}
      {auth.type === 'basic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="md-input"
            placeholder="Username"
            value={auth.basicUser}
            onChange={(e) => updateActiveTab({ auth: { ...auth, basicUser: e.target.value } })}
            style={{ maxWidth: '300px' }}
          />
          <input
            type="password"
            className="md-input"
            placeholder="Password"
            value={auth.basicPass}
            onChange={(e) => updateActiveTab({ auth: { ...auth, basicPass: e.target.value } })}
            style={{ maxWidth: '300px' }}
          />
        </div>
      )}
    </>
  );
}
