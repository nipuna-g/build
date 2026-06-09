import type { Session } from '../types';
import { aggregateByExercise } from '../aggregate';
import TabBar, { type Tab } from './TabBar';

interface Props {
  sessions: Session[];
  onTabChange: (tab: Tab) => void;
  onSelectExercise: (name: string) => void;
  onReload: () => void;
}

export default function ExerciseList({ sessions, onTabChange, onSelectExercise, onReload }: Props) {
  const exercises = aggregateByExercise(sessions);

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
      <TabBar active="exercises" onChange={onTabChange} />

      {exercises.length === 0 && (
        <p className="text-zinc-500 text-center py-12">No exercises found.</p>
      )}

      <ul className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
        {exercises.map((ex) => (
          <li key={ex.name}>
            <button
              onClick={() => onSelectExercise(ex.name)}
              className="w-full px-5 py-3 text-left hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3"
            >
              <span className="text-white font-medium truncate">{ex.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-300 tabular-nums text-sm">
                  {ex.allTimeMax !== null ? `Best ${ex.allTimeMax}` : '—'}
                </span>
                <svg
                  className="w-4 h-4 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
