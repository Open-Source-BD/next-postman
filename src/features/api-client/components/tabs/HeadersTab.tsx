'use client';
import { selectActiveTab, useApiStore } from '../../store/useApiStore';
import { KvEditor } from '../KvEditor';

export function HeadersTab() {
  const tab = useApiStore(selectActiveTab);
  const updateActiveTab = useApiStore((s) => s.updateActiveTab);
  return <KvEditor items={tab.headers} onChange={(headers) => updateActiveTab({ headers })} />;
}
