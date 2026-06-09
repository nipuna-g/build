import type { Session } from '../types';
import { aggregateByExercise } from '../aggregate';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  sessions: Session[];
  exerciseName: string;
  onBack: () => void;
  onSelectSession: (index: number) => void;
}

function formatShortDate(iso: string | null, raw: string | null): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }
  return raw ?? '';
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

          {(() => {
            const chartData = ex.entries
              .filter((e) => e.maxWeight !== null)
              .map((e) => ({
                date: formatShortDate(e.date_iso, e.date_raw),
                weight: e.maxWeight as number,
                sortKey: e.date_iso ?? '',
              }))
              .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
            if (chartData.length < 2) return null;
            return (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        color: '#fafafa',
                      }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

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
