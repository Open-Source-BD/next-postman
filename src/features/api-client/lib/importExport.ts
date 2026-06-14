import type { Collection, EnvVar, Environment, ExportData } from '../types';
import { migrateCollections } from './collectionTree';
import { fromPostman, isPostmanCollection, toPostman } from './postmanFormat';
import { generateId } from './id';

/** Accept either Environment[] or a legacy flat EnvVar[] from imported data. */
function migrateEnvs(raw: unknown): Environment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0] as Record<string, unknown>;
  if (first && Array.isArray(first.vars)) return raw as Environment[];
  return [{ id: generateId(), name: 'Imported', vars: raw as EnvVar[] }];
}

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

/** App-native JSON export of all collections + environments + globals. */
export function exportData(collections: Collection[], environments: Environment[], globals: EnvVar[] = []): void {
  const data: ExportData = { collections, environments, globals, version: 2 };
  download(`postman-clone-export-${today()}.json`, JSON.stringify(data, null, 2));
}

/** Export a single collection as a Postman Collection v2.1 file. */
export function exportPostman(collection: Collection): void {
  const safe = collection.name.replace(/[^\w.-]+/g, '_');
  download(`${safe}.postman_collection.json`, JSON.stringify(toPostman(collection), null, 2));
}

export interface ParsedImport {
  collections: Collection[];
  environments: Environment[];
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
          environments: migrateEnvs(data.environments),
        });
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
