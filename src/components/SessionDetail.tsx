import type { Session, Superset, WarmupRow } from '../types';

interface Props {
  session: Session;
  onBack: () => void;
}

function SetTable({ sets }: { sets: Array<{ set: string | null; weight: string | null; rep: string | null; rir: string | null; remark: string | null }> }) {
  if (sets.length === 0) return null;
  return (
    <table className="w-full text-sm mt-3">
      <thead>
        <tr className="text-zinc-500 text-xs uppercase tracking-wide">
          <th className="text-left pb-2 font-medium w-20">Set</th>
          <th className="text-left pb-2 font-medium w-24">Weight</th>
          <th className="text-left pb-2 font-medium w-20">Reps</th>
          <th className="text-left pb-2 font-medium w-16">RIR</th>
          <th className="text-left pb-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {sets.map((set, i) => (
          <tr key={i} className="border-t border-zinc-800">
            <td className="py-1.5 text-zinc-400">{set.set ?? '—'}</td>
            <td className="py-1.5 text-white font-medium">{set.weight ?? '—'}</td>
            <td className="py-1.5 text-white">{set.rep ?? '—'}</td>
            <td className="py-1.5 text-zinc-400">{set.rir ?? '—'}</td>
            <td className="py-1.5 text-zinc-500 text-xs">{set.remark ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WarmupSection({ warmups }: { warmups: WarmupRow[] }) {
  if (warmups.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Warm Up</h3>
      <div className="flex flex-col gap-2">
        {warmups.map((w, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg px-4 py-3">
            <div className="text-zinc-300 font-medium">{w.exercise}</div>
            {(w.rep || w.weight) && (
              <div className="text-sm text-zinc-500 mt-0.5">
                {[w.rep, w.weight].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SupersetSection({ superset }: { superset: Superset }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        Superset {superset.group}
      </h3>
      <div className="flex flex-col gap-4">
        {superset.exercises.map((ex, i) => (
          <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block text-xs font-bold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded mr-2">
                  {ex.slot}
                </span>
                <span className="text-white font-semibold">{ex.name}</span>
                {ex.detail && (
                  <span className="ml-2 text-zinc-400 text-sm">({ex.detail})</span>
                )}
              </div>
            </div>
            {ex.coach_remark && (
              <p className="mt-2 text-sm text-amber-400/80 italic">"{ex.coach_remark}"</p>
            )}
            <SetTable sets={ex.sets} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SessionDetail({ session, onBack }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to sessions
      </button>

      <div className="mb-8">
        <div className="text-zinc-500 text-sm mb-1">{session.block}</div>
        <h1 className="text-2xl font-bold text-white">
          Week {session.week} · Session {session.session}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          {session.date_raw && (
            <span className="text-zinc-400 text-sm">{session.date_raw}</span>
          )}
          {session.coach && (
            <span className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
              {session.coach}
            </span>
          )}
        </div>
      </div>

      <WarmupSection warmups={session.warmups} />

      {session.supersets.map((ss, i) => (
        <SupersetSection key={i} superset={ss} />
      ))}
    </div>
  );
}
