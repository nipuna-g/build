import { useEffect, useState } from 'react';

interface Props {
  value: string | null;
  placeholder: string;
  onCommit: (next: string) => void;
  inputMode?: 'numeric' | 'text';
  disabled?: boolean;
  displayClass: string;
  inputClass: string;
}

export default function EditableText({
  value,
  placeholder,
  onCommit,
  inputMode,
  disabled,
  displayClass,
  inputClass,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  if (editing && !disabled) {
    return (
      <input
        autoFocus
        value={draft}
        inputMode={inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const next = draft.trim();
          if (next !== (value ?? '')) onCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
        className={inputClass}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setDraft(value ?? '');
        setEditing(true);
      }}
      className={`${displayClass} ${
        disabled ? 'cursor-default' : 'cursor-text hover:bg-zinc-700/40 rounded px-1 -mx-1'
      }`}
      title={disabled ? 'Reload sheet to enable editing' : undefined}
    >
      {value || <span className="text-zinc-600">{placeholder}</span>}
    </button>
  );
}
