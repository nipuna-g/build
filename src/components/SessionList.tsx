import type { Session } from '../types';
import TabBar, { type Tab } from './TabBar';

interface Props {
  sessions: Session[];
  onSelect: (index: number) => void;
  onTabChange: (tab: Tab) => void;
  onReload: () => void;
}

function groupByBlock(sessions: Session[]): Map<string, { session: Session; index: number }[]> {
  const map = new Map<string, { session: Session; index: number }[]>();
  sessions.forEach((s, i) => {
    const key = s.block;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ session: s, index: i });
  });
  return map;
}

export default function SessionList({ sessions, onSelect, onTabChange, onReload }: Props) {
  const groups = groupByBlock(sessions);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">BUILD Tracker</h1>
        <button
          onClick={onReload}
          className="text-zinc-400 hover:text-white text-sm"
          title="Reload sheet"
        >
          Reload
        </button>
      </div>
      <TabBar active="sessions" onChange={onTabChange} />

      {Array.from(groups.entries()).map(([block, items]) => (
        <div key={block} className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            {block}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map(({ session: s, index }) => (
              <button
                key={index}
                onClick={() => onSelect(index)}
                className="w-full text-left bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 rounded-xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium">
                      Week {s.week} · Session {s.session}
                    </span>
                    {s.date_raw && (
                      <span className="ml-3 text-zinc-400 text-sm">{s.date_raw}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.coach && (
                      <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full">
                        {s.coach}
                      </span>
                    )}
                    <svg
                      className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  {s.supersets.length > 0 && (
                    <span>{s.supersets.reduce((acc, ss) => acc + ss.exercises.length, 0)} exercises</span>
                  )}
                  {s.warmups.length > 0 && (
                    <span className="ml-2">· {s.warmups.length} warmup{s.warmups.length > 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
