import { useEffect, useState } from 'react';
import type { Session, SetRow, Superset, WarmupRow } from '../types';
import DurationTimer, { parseDurationSeconds } from './DurationTimer';
import EditableText from './EditableText';
import { findLastTime } from '../lastTime';
import { setKey, useCompletion, warmupKey, type CompletionMap } from '../completion';
import { commitEdit, type EditField, type SetLocator } from '../edit';

export type { SetLocator } from '../edit';

interface Props {
  session: Session;
  sessions: Session[];
  sessionIndex: number;
  onBack: () => void;
  onUpdateSet: (
    sessionIndex: number,
    locator: SetLocator,
    patch: Partial<SetRow>,
  ) => void;
  onReauth: () => void;
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
  supersetIndex,
  exerciseIndex,
  completion,
  toggle,
  onEdit,
}: {
  sets: SetRow[];
  slot: string;
  sessionIndex: number;
  supersetIndex: number;
  exerciseIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
  onEdit: (locator: SetLocator, field: EditField, prev: string | null, next: string) => void;
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
          const locator: SetLocator = {
            kind: 'superset',
            supersetIndex,
            exerciseIndex,
            setIndex: i,
          };
          const editable = !!set.cell;
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
              <td className="py-1.5 text-zinc-400">
                <EditableText
                  value={set.rir}
                  placeholder="—"
                  onCommit={(v) => onEdit(locator, 'rir', set.rir, v)}
                  inputMode="numeric"
                  disabled={!editable}
                  displayClass="text-left"
                  inputClass="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </td>
              <td className="py-1.5 text-zinc-500 text-xs">
                <EditableText
                  value={set.remark}
                  placeholder="+ note"
                  onCommit={(v) => onEdit(locator, 'remark', set.remark, v)}
                  inputMode="text"
                  disabled={!editable}
                  displayClass="text-left w-full block"
                  inputClass="w-full bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </td>
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
  onEdit,
}: {
  warmups: WarmupRow[];
  sessionIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
  onEdit: (locator: SetLocator, field: EditField, prev: string | null, next: string) => void;
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
          const locator: SetLocator = { kind: 'warmup', warmupIndex: i };
          const editable = !!w.cell;
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
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span>
                    RIR{' '}
                    <EditableText
                      value={w.rir}
                      placeholder="—"
                      onCommit={(v) => onEdit(locator, 'rir', w.rir, v)}
                      inputMode="numeric"
                      disabled={!editable}
                      displayClass="text-left inline-block min-w-[1ch]"
                      inputClass="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </span>
                  <span className="flex-1">
                    <EditableText
                      value={w.remark}
                      placeholder="+ note"
                      onCommit={(v) => onEdit(locator, 'remark', w.remark, v)}
                      inputMode="text"
                      disabled={!editable}
                      displayClass="text-left w-full block"
                      inputClass="w-full bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </span>
                </div>
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
  supersetIndex,
  sessions,
  sessionIndex,
  completion,
  toggle,
  onEdit,
}: {
  superset: Superset;
  supersetIndex: number;
  sessions: Session[];
  sessionIndex: number;
  completion: CompletionMap;
  toggle: (key: string) => void;
  onEdit: (locator: SetLocator, field: EditField, prev: string | null, next: string) => void;
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
                supersetIndex={supersetIndex}
                exerciseIndex={i}
                completion={completion}
                toggle={toggle}
                onEdit={onEdit}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionDetail({
  session,
  sessions,
  sessionIndex,
  onBack,
  onUpdateSet,
  onReauth,
}: Props) {
  useScreenWakeLock();
  const { map: completion, toggle } = useCompletion();
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(t);
  }, [error]);

  const handleEdit = async (
    locator: SetLocator,
    field: EditField,
    prev: string | null,
    next: string,
  ) => {
    const result = await commitEdit({
      session,
      locator,
      field,
      prev,
      next,
      applyOptimistic: (patch) => onUpdateSet(sessionIndex, locator, patch),
    });
    if (!result.ok) {
      setError(result.message);
      setAuthError(result.reason === 'auth');
    }
  };

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

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-red-900/30 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-lg">
          <span>{error}</span>
          {authError ? (
            <button
              onClick={onReauth}
              className="shrink-0 text-red-100 underline hover:text-white"
            >
              Sign in
            </button>
          ) : (
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-red-200/70 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      )}

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
        onEdit={handleEdit}
      />

      {session.supersets.map((ss, i) => (
        <SupersetSection
          key={i}
          superset={ss}
          supersetIndex={i}
          sessions={sessions}
          sessionIndex={sessionIndex}
          completion={completion}
          toggle={toggle}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
}
