import type { Collection, EnvVar, ExportData } from '../types';

/** Trigger a JSON download of collections + environments. */
export function exportData(collections: Collection[], environments: EnvVar[]): void {
  const data: ExportData = { collections, environments, version: 1 };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `postman-clone-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParsedImport {
  collections: Collection[];
  environments: EnvVar[];
}

/** Read + parse an exported JSON file. Rejects on invalid JSON. */
export function parseImportFile(file: File): Promise<ParsedImport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result)) as Partial<ExportData>;
        resolve({
          collections: data.collections ?? [],
          environments: data.environments ?? [],
        });
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
