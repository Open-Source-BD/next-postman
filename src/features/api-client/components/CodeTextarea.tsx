'use client';
import { computeEdit, type EditorLang } from '../lib/editorKeys';

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLang;
};

/** Textarea with code-editor key handling: auto-pairing, overtype, tag-close, smart Enter/Tab. */
export function CodeTextarea({ value, onChange, language = 'js', ...rest }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const action = computeEdit({
      key: e.key,
      value: el.value,
      selStart: el.selectionStart,
      selEnd: el.selectionEnd,
      lang: language,
    });
    if (!action) return;
    e.preventDefault();
    el.setRangeText(action.text, action.start, action.end, 'end');
    el.setSelectionRange(action.cursorStart, action.cursorEnd);
    onChange(el.value);
  };

  return (
    <textarea
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}
