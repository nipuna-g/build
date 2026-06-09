import type { Session } from '../types';
import { aggregateByExercise } from '../aggregate';

interface Props {
  sessions: Session[];
  exerciseName: string;
  onBack: () => void;
  onSelectSession: (index: number) => void;
}

export default function ExerciseDetail({ sessions, exerciseName, onBack, onSelectSession }: Props) {
  const all = aggregateByExercise(sessions);
  const ex = all.find((e) => e.name === exerciseName);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Exercises
      </button>

      {!ex ? (
        <p className="text-zinc-500 text-center py-12">Exercise not found.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{ex.name}</h1>
            {ex.allTimeMax !== null && (
              <span className="text-xs bg-violet-500/10 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                Best: {ex.allTimeMax}
              </span>
            )}
          </div>

          <ul className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
            {ex.entries.map((e, i) => {
              const isPr = ex.allTimeMax !== null && e.maxWeight === ex.allTimeMax;
              return (
                <li key={i}>
                  <button
                    onClick={() => onSelectSession(e.sessionIndex)}
                    className="w-full px-5 py-3 text-left hover:bg-zinc-800/40 transition-colors flex items-center justify-between"
                  >
                    <div className="text-zinc-400 text-sm">
                      {e.date_iso ?? e.date_raw ?? e.block}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium tabular-nums">
                        {e.maxWeightDisplay ?? '—'}
                      </span>
                      {isPr && <span className="text-violet-400 text-xs">★</span>}
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
