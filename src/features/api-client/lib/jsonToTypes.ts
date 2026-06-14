export type TypeLang = 'typescript' | 'go' | 'python' | 'rust';

export const TYPE_LANGS: { id: TypeLang; label: string }[] = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'go', label: 'Go' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
];

type Shape =
  | { t: 'string' | 'integer' | 'number' | 'boolean' | 'null' | 'any' }
  | { t: 'array'; el: Shape }
  | { t: 'object'; name: string; fields: { key: string; node: Shape }[] };

const pascal = (s: string): string =>
  s.replace(/(^|[_\s-]+)(\w)/g, (_, __, c: string) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '') || 'Field';

const singular = (s: string): string => (s.length > 1 && s.endsWith('s') ? s.slice(0, -1) : s);

const snake = (s: string): string =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();

function infer(value: unknown, nameHint: string, used: Set<string>): Shape {
  if (value === null) return { t: 'null' };
  if (Array.isArray(value)) {
    return { t: 'array', el: value.length ? infer(value[0], singular(nameHint), used) : { t: 'any' } };
  }
  if (typeof value === 'object') {
    let name = pascal(nameHint);
    while (used.has(name)) name += '_';
    used.add(name);
    const fields = Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
      key,
      node: infer(v, key, used),
    }));
    return { t: 'object', name, fields };
  }
  if (typeof value === 'number') return { t: Number.isInteger(value) ? 'integer' : 'number' };
  if (typeof value === 'boolean') return { t: 'boolean' };
  if (typeof value === 'string') return { t: 'string' };
  return { t: 'any' };
}

/** Collect object definitions children-first (so forward refs aren't needed). */
function collect(shape: Shape, out: Extract<Shape, { t: 'object' }>[], seen: Set<string>): void {
  if (shape.t === 'array') collect(shape.el, out, seen);
  else if (shape.t === 'object') {
    shape.fields.forEach((f) => collect(f.node, out, seen));
    if (!seen.has(shape.name)) {
      seen.add(shape.name);
      out.push(shape);
    }
  }
}

// --- Per-language type mappers ---

function tsType(s: Shape): string {
  switch (s.t) {
    case 'string': return 'string';
    case 'integer':
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'null': return 'null';
    case 'any': return 'unknown';
    case 'array': return `${tsType(s.el)}[]`;
    case 'object': return s.name;
  }
}

function goType(s: Shape): string {
  switch (s.t) {
    case 'string': return 'string';
    case 'integer': return 'int';
    case 'number': return 'float64';
    case 'boolean': return 'bool';
    case 'null':
    case 'any': return 'interface{}';
    case 'array': return `[]${goType(s.el)}`;
    case 'object': return s.name;
  }
}

function pyType(s: Shape): string {
  switch (s.t) {
    case 'string': return 'str';
    case 'integer': return 'int';
    case 'number': return 'float';
    case 'boolean': return 'bool';
    case 'null':
    case 'any': return 'Any';
    case 'array': return `List[${pyType(s.el)}]`;
    case 'object': return s.name;
  }
}

function rustType(s: Shape): string {
  switch (s.t) {
    case 'string': return 'String';
    case 'integer': return 'i64';
    case 'number': return 'f64';
    case 'boolean': return 'bool';
    case 'null':
    case 'any': return 'serde_json::Value';
    case 'array': return `Vec<${rustType(s.el)}>`;
    case 'object': return s.name;
  }
}

function emitTs(defs: Extract<Shape, { t: 'object' }>[]): string {
  return defs
    .map(
      (d) =>
        `export interface ${d.name} {\n${d.fields
          .map((f) => `  ${/^[A-Za-z_$][\w$]*$/.test(f.key) ? f.key : `"${f.key}"`}: ${tsType(f.node)};`)
          .join('\n')}\n}`
    )
    .join('\n\n');
}

function emitGo(defs: Extract<Shape, { t: 'object' }>[]): string {
  return defs
    .map(
      (d) =>
        `type ${d.name} struct {\n${d.fields
          .map((f) => `\t${pascal(f.key)} ${goType(f.node)} \`json:"${f.key}"\``)
          .join('\n')}\n}`
    )
    .join('\n\n');
}

function emitPython(defs: Extract<Shape, { t: 'object' }>[]): string {
  const header = 'from __future__ import annotations\nfrom typing import Any, List\nfrom pydantic import BaseModel\n';
  const body = defs
    .map(
      (d) =>
        `class ${d.name}(BaseModel):\n${d.fields
          .map((f) => `    ${/^[A-Za-z_]\w*$/.test(f.key) ? f.key : snake(f.key)}: ${pyType(f.node)}`)
          .join('\n')}`
    )
    .join('\n\n');
  return `${header}\n${body}`;
}

function emitRust(defs: Extract<Shape, { t: 'object' }>[]): string {
  const header = 'use serde::{Deserialize, Serialize};\n';
  const body = defs
    .map((d) => {
      const fields = d.fields
        .map((f) => {
          const name = snake(f.key);
          const rename = name !== f.key ? `    #[serde(rename = "${f.key}")]\n` : '';
          return `${rename}    pub ${name}: ${rustType(f.node)},`;
        })
        .join('\n');
      return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${d.name} {\n${fields}\n}`;
    })
    .join('\n\n');
  return `${header}\n${body}`;
}

/** Generate type definitions for the parsed JSON value in the chosen language. */
export function generateTypes(value: unknown, lang: TypeLang, rootName = 'Root'): string {
  const shape = infer(value, rootName, new Set());
  if (shape.t !== 'object' && !(shape.t === 'array' && shape.el.t === 'object')) {
    return '// Response is not a JSON object — no named types to generate.';
  }
  const defs: Extract<Shape, { t: 'object' }>[] = [];
  collect(shape, defs, new Set());
  if (!defs.length) return '// No object types found.';

  switch (lang) {
    case 'typescript': return emitTs(defs);
    case 'go': return emitGo(defs);
    case 'python': return emitPython(defs);
    case 'rust': return emitRust(defs);
  }
}
