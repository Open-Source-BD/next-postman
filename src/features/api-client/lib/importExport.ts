import type { Collection, EnvVar, ExportData } from '../types';
import { migrateCollections } from './collectionTree';
import { fromPostman, isPostmanCollection, toPostman } from './postmanFormat';

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().split('T')[0];

/** App-native JSON export of all collections + environments. */
export function exportData(collections: Collection[], environments: EnvVar[]): void {
  const data: ExportData = { collections, environments, version: 2 };
  download(`postman-clone-export-${today()}.json`, JSON.stringify(data, null, 2));
}

/** Export a single collection as a Postman Collection v2.1 file. */
export function exportPostman(collection: Collection): void {
  const safe = collection.name.replace(/[^\w.-]+/g, '_');
  download(`${safe}.postman_collection.json`, JSON.stringify(toPostman(collection), null, 2));
}

export interface ParsedImport {
  collections: Collection[];
  environments: EnvVar[];
}

/**
 * Read + parse an imported JSON file. Auto-detects Postman Collection v2.1 vs
 * the app's own export, and migrates legacy flat collections to the tree shape.
 */
export function parseImportFile(file: File): Promise<ParsedImport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target?.result)) as unknown;

        if (isPostmanCollection(json)) {
          resolve({ collections: [fromPostman(json)], environments: [] });
          return;
        }

        const data = json as Partial<ExportData>;
        resolve({
          collections: migrateCollections(data.collections ?? []),
          environments: Array.isArray(data.environments) ? data.environments : [],
        });
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
