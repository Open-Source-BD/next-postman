export interface EditAction {
  /** Range to replace via setRangeText. */
  start: number;
  end: number;
  text: string;
  /** Resulting selection. */
  cursorStart: number;
  cursorEnd: number;
}

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const OVERTYPE = new Set([')', ']', '}', '"', "'", '`']);

// HTML void elements — never get a closing tag.
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export type EditorLang = 'json' | 'js' | 'xml' | 'html' | 'text';

interface KeyCtx {
  key: string;
  value: string;
  selStart: number;
  selEnd: number;
  lang?: EditorLang;
}

const indentOf = (value: string, pos: number): string => {
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  return value.slice(lineStart, pos).match(/^[ \t]*/)![0];
};

/**
 * Compute a code-editor edit for a keypress (auto-pairing, overtype, smart
 * Enter, Tab). Returns null to let the default textarea behavior happen.
 */
export function computeEdit({ key, value, selStart, selEnd, lang = 'js' }: KeyCtx): EditAction | null {
  const collapsed = selStart === selEnd;
  const next = value[selStart];
  const pairing = lang !== 'text';

  // HTML/XML: typing '>' to finish an opening tag inserts the matching close tag.
  if ((lang === 'html' || lang === 'xml') && key === '>') {
    const lt = value.lastIndexOf('<', selStart - 1);
    if (lt !== -1) {
      const seg = value.slice(lt, selStart);
      const m = seg.match(/^<([a-zA-Z][\w:-]*)([^<>]*)$/);
      if (m && !seg.endsWith('/') && !seg.startsWith('</')) {
        const tag = m[1];
        const isVoid = lang === 'html' && VOID_TAGS.has(tag.toLowerCase());
        if (!isVoid) {
          return {
            start: selStart,
            end: selEnd,
            text: `></${tag}>`,
            cursorStart: selStart + 1,
            cursorEnd: selStart + 1,
          };
        }
      }
    }
  }

  // Overtype: typing a closer/quote when it's already the next char.
  if (pairing && collapsed && OVERTYPE.has(key) && next === key) {
    return { start: selStart, end: selStart, text: '', cursorStart: selStart + 1, cursorEnd: selStart + 1 };
  }

  // Open a pair (or wrap the selection).
  if (pairing && PAIRS[key]) {
    const close = PAIRS[key];
    if (!collapsed) {
      const sel = value.slice(selStart, selEnd);
      return {
        start: selStart,
        end: selEnd,
        text: key + sel + close,
        cursorStart: selStart + 1,
        cursorEnd: selEnd + 1,
      };
    }
    return { start: selStart, end: selEnd, text: key + close, cursorStart: selStart + 1, cursorEnd: selStart + 1 };
  }

  // Backspace inside an empty pair deletes both.
  if (pairing && key === 'Backspace' && collapsed && selStart > 0) {
    const before = value[selStart - 1];
    if (PAIRS[before] && PAIRS[before] === value[selStart]) {
      return { start: selStart - 1, end: selStart + 1, text: '', cursorStart: selStart - 1, cursorEnd: selStart - 1 };
    }
  }

  if (key === 'Enter' && collapsed) {
    const indent = indentOf(value, selStart);
    const before = value[selStart - 1];
    // Inside an empty pair → expand to an indented block.
    if (before && PAIRS[before] && PAIRS[before] === value[selStart]) {
      const inner = `\n${indent}  `;
      const text = `${inner}\n${indent}`;
      const pos = selStart + inner.length;
      return { start: selStart, end: selStart, text, cursorStart: pos, cursorEnd: pos };
    }
    // Otherwise keep the current line's indentation.
    if (indent) {
      const text = `\n${indent}`;
      const pos = selStart + text.length;
      return { start: selStart, end: selStart, text, cursorStart: pos, cursorEnd: pos };
    }
  }

  // Tab inserts two spaces instead of moving focus.
  if (key === 'Tab') {
    return { start: selStart, end: selEnd, text: '  ', cursorStart: selStart + 2, cursorEnd: selStart + 2 };
  }

  return null;
}
