import type { Session, SetRow } from './types';
import { normalizeKey } from './aggregate';

export interface LastTimeEntry {
  date_iso: string | null;
  date_raw: string | null;
  topSet: SetRow;
  setCount: number;
}

function parseWeight(raw: string | null): number {
  if (!raw) return -Infinity;
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return -Infinity;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : -Infinity;
}

export function findLastTime(
  sessions: Session[],
  currentIndex: number,
  exerciseName: string,
): LastTimeEntry | null {
  const target = normalizeKey(exerciseName);
  const currentDate = sessions[currentIndex]?.date_iso ?? '';

  let best: { session: Session; topSet: SetRow; setCount: number } | null = null;

  for (let i = 0; i < sessions.length; i++) {
    if (i === currentIndex) continue;
    const s = sessions[i];
    const cmp = (s.date_iso ?? '').localeCompare(currentDate);
    if (currentDate && cmp >= 0) continue;

    for (const ss of s.supersets) {
      for (const ex of ss.exercises) {
        if (!ex.name || ex.sets.length === 0) continue;
        if (normalizeKey(ex.name) !== target) continue;

        let topSet = ex.sets[0];
        let topW = parseWeight(topSet.weight);
        for (let k = 1; k < ex.sets.length; k++) {
          const w = parseWeight(ex.sets[k].weight);
          if (w > topW) {
            topW = w;
            topSet = ex.sets[k];
          }
        }

        if (
          !best ||
          (s.date_iso ?? '').localeCompare(best.session.date_iso ?? '') > 0
        ) {
          best = { session: s, topSet, setCount: ex.sets.length };
        }
      }
    }
  }

  if (!best) return null;
  return {
    date_iso: best.session.date_iso,
    date_raw: best.session.date_raw,
    topSet: best.topSet,
    setCount: best.setCount,
  };
}
