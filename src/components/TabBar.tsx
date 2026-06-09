export type Tab = 'sessions' | 'exercises';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ active, onChange }: Props) {
  const base = 'flex-1 py-2 text-sm font-medium rounded-md transition-colors';
  const on = 'bg-zinc-700 text-white';
  const off = 'text-zinc-400 hover:text-white';
  return (
    <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-8">
      <button className={`${base} ${active === 'sessions' ? on : off}`} onClick={() => onChange('sessions')}>
        Sessions
      </button>
      <button className={`${base} ${active === 'exercises' ? on : off}`} onClick={() => onChange('exercises')}>
        Exercises
      </button>
    </div>
  );
}
