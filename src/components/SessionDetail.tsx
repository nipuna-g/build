import { useEffect } from 'react';
import type { Session, SetRow, Superset, WarmupRow } from '../types';
import DurationTimer, { parseDurationSeconds } from './DurationTimer';
import { findLastTime } from '../lastTime';
import { setKey, useCompletion, warmupKey, type CompletionMap } from '../completion';

interface Props {
  session: Session;
  sessions: Session[];
  sessionIndex: number;
  onBack: () => void;
}

function CheckCell({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? 'Mark set incomplete' : 'Mark set complete'}
      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
        done
          ? 'bg-violet-500 border-violet-500 text-white'
          : 'border-zinc-600 hover:border-zinc-400'
      }`}
    >
      {done && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function useScreenWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (!('wakeLock' in navigator)) return;
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* permission denied or feature unsupported — ignore */
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled && !sentinel) {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, []);
}

function SetTable({
  sets,
  slot,
  sessionIndex,
  completion,
  toggle,
}: {
  sets: SetRow[];
  slot: string;
  sessionIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
}) {
  if (sets.length === 0) return null;
  return (
    <table className="w-full text-sm mt-3">
      <thead>
        <tr className="text-zinc-500 text-xs uppercase tracking-wide">
          <th className="w-8 pb-2"></th>
          <th className="text-left pb-2 font-medium w-16">Set</th>
          <th className="text-left pb-2 font-medium w-24">Weight</th>
          <th className="text-left pb-2 font-medium w-20">Reps</th>
          <th className="text-left pb-2 font-medium w-16">RIR</th>
          <th className="text-left pb-2 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {sets.map((set, i) => {
          const duration = parseDurationSeconds(set.rep);
          const key = setKey(sessionIndex, slot, i);
          const done = !!completion[key];
          return (
            <tr
              key={i}
              className={`border-t border-zinc-800 ${done ? 'opacity-50' : ''}`}
            >
              <td className="py-1.5">
                <CheckCell done={done} onToggle={() => toggle(key)} />
              </td>
              <td className="py-1.5 text-zinc-400">{set.set ?? '—'}</td>
              <td className={`py-1.5 font-medium ${done ? 'line-through text-zinc-500' : 'text-white'}`}>
                {set.weight ?? '—'}
              </td>
              <td className={`py-1.5 ${done ? 'line-through text-zinc-500' : 'text-white'}`}>
                {duration !== null && set.rep ? (
                  <DurationTimer seconds={duration} label={set.rep} />
                ) : (
                  (set.rep ?? '—')
                )}
              </td>
              <td className="py-1.5 text-zinc-400">{set.rir ?? '—'}</td>
              <td className="py-1.5 text-zinc-500 text-xs">{set.remark ?? ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function WarmupSection({
  warmups,
  sessionIndex,
  completion,
  toggle,
}: {
  warmups: WarmupRow[];
  sessionIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
}) {
  if (warmups.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Warm Up</h3>
      <div className="flex flex-col gap-2">
        {warmups.map((w, i) => {
          const duration = parseDurationSeconds(w.rep);
          const key = warmupKey(sessionIndex, i);
          const done = !!completion[key];
          return (
            <div
              key={i}
              className={`bg-zinc-800/50 rounded-lg px-4 py-3 flex items-start gap-3 ${
                done ? 'opacity-50' : ''
              }`}
            >
              <div className="mt-0.5">
                <CheckCell done={done} onToggle={() => toggle(key)} />
              </div>
              <div className="flex-1">
                <div className={`font-medium ${done ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                  {w.exercise}
                </div>
                {(w.rep || w.weight) && (
                  <div className="text-sm text-zinc-500 mt-0.5 flex items-center gap-2">
                    {duration !== null && w.rep ? (
                      <DurationTimer seconds={duration} label={w.rep} />
                    ) : (
                      w.rep && <span>{w.rep}</span>
                    )}
                    {w.weight && <span>· {w.weight}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatLastTime(
  last: ReturnType<typeof findLastTime>,
): string | null {
  if (!last) return null;
  const { topSet, setCount } = last;
  const parts: string[] = [];
  if (topSet.weight) parts.push(topSet.weight);
  if (topSet.rep) parts.push(`× ${topSet.rep}`);
  if (topSet.rir) parts.push(`@ RIR ${topSet.rir}`);
  const body = parts.length > 0 ? parts.join(' ') : '—';
  const when = last.date_iso ?? last.date_raw ?? '';
  const setsTag = setCount > 1 ? ` (top of ${setCount} sets)` : '';
  return when ? `Last: ${body}${setsTag} · ${when}` : `Last: ${body}${setsTag}`;
}

function SupersetSection({
  superset,
  sessions,
  sessionIndex,
  completion,
  toggle,
}: {
  superset: Superset;
  sessions: Session[];
  sessionIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        Superset {superset.group}
      </h3>
      <div className="flex flex-col gap-4">
        {superset.exercises.map((ex, i) => {
          const lastLine = ex.name
            ? formatLastTime(findLastTime(sessions, sessionIndex, ex.name))
            : null;
          return (
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
              {lastLine && (
                <p className="mt-1 text-xs text-zinc-500 tabular-nums">{lastLine}</p>
              )}
              {ex.coach_remark && (
                <p className="mt-2 text-sm text-amber-400/80 italic">"{ex.coach_remark}"</p>
              )}
              <SetTable
                sets={ex.sets}
                slot={ex.slot}
                sessionIndex={sessionIndex}
                completion={completion}
                toggle={toggle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionDetail({ session, sessions, sessionIndex, onBack }: Props) {
  useScreenWakeLock();
  const { map: completion, toggle } = useCompletion();

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

      <WarmupSection
        warmups={session.warmups}
        sessionIndex={sessionIndex}
        completion={completion}
        toggle={toggle}
      />

      {session.supersets.map((ss, i) => (
        <SupersetSection
          key={i}
          superset={ss}
          sessions={sessions}
          sessionIndex={sessionIndex}
          completion={completion}
          toggle={toggle}
        />
      ))}
    </div>
  );
}
