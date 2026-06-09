import type { Session } from './types';

export interface ExerciseEntry {
  sessionIndex: number;
  block: string;
  date_iso: string | null;
  date_raw: string | null;
  maxWeight: number | null;
  maxWeightDisplay: string | null;
  setCount: number;
}

export interface ExerciseHistory {
  name: string;
  allTimeMax: number | null;
  lastEntry: ExerciseEntry | null;
  entries: ExerciseEntry[];
}

function parseWeight(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

const ABBREV: Record<string, string> = {
  sa: 'single arm',
  oh: 'overhead',
  lm: 'landmine',
  rdl: 'romanian deadlift',
  db: 'dumbbell',
  bb: 'barbell',
  'c&p': 'clean and press',
  cp: 'clean and press',
  ez: 'ez',
  trx: 'trx',
};

function normalizeKey(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[+\-,./()"']/g, ' ');
  s = s.replace(/\bpushdown(s?)\b/g, 'push down$1');
  s = s.replace(/\bpulldown(s?)\b/g, 'pull down$1');
  s = s.replace(/\bwoodchop/g, 'wood chop');
  s = s.replace(/\s+/g, ' ').trim();
  s = s
    .split(' ')
    .map((w) => ABBREV[w] ?? w)
    .join(' ');
  s = s
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
  return s.trim();
}

export function aggregateByExercise(sessions: Session[]): ExerciseHistory[] {
  const map = new Map<string, ExerciseHistory>();
  const nameCounts = new Map<string, Map<string, number>>();

  sessions.forEach((session, sessionIndex) => {
    for (const ss of session.supersets) {
      for (const ex of ss.exercises) {
        if (!ex.name) continue;
        const key = normalizeKey(ex.name);
        let hist = map.get(key);
        if (!hist) {
          hist = { name: ex.name, allTimeMax: null, lastEntry: null, entries: [] };
          map.set(key, hist);
        }
        let counts = nameCounts.get(key);
        if (!counts) {
          counts = new Map();
          nameCounts.set(key, counts);
        }
        counts.set(ex.name, (counts.get(ex.name) ?? 0) + 1);

        let maxWeight: number | null = null;
        let maxWeightDisplay: string | null = null;
        for (const set of ex.sets) {
          const w = parseWeight(set.weight);
          if (w !== null && (maxWeight === null || w > maxWeight)) {
            maxWeight = w;
            maxWeightDisplay = set.weight;
          }
        }

        hist.entries.push({
          sessionIndex,
          block: session.block,
          date_iso: session.date_iso,
          date_raw: session.date_raw,
          maxWeight,
          maxWeightDisplay,
          setCount: ex.sets.length,
        });
      }
    }
  });

  for (const [key, hist] of map.entries()) {
    const counts = nameCounts.get(key);
    if (counts) {
      let best = hist.name;
      let bestCount = -1;
      for (const [name, count] of counts.entries()) {
        if (count > bestCount || (count === bestCount && name.length > best.length)) {
          best = name;
          bestCount = count;
        }
      }
      hist.name = best;
    }
    hist.entries.sort((a, b) => {
      const ai = a.date_iso ?? '';
      const bi = b.date_iso ?? '';
      if (ai && bi) return bi.localeCompare(ai);
      if (ai) return -1;
      if (bi) return 1;
      return b.sessionIndex - a.sessionIndex;
    });
    hist.lastEntry = hist.entries[0] ?? null;
    hist.allTimeMax = hist.entries.reduce<number | null>((m, e) => {
      if (e.maxWeight === null) return m;
      return m === null || e.maxWeight > m ? e.maxWeight : m;
    }, null);
  }

  return Array.from(map.values()).sort((a, b) => {
    const ad = a.lastEntry?.date_iso ?? '';
    const bd = b.lastEntry?.date_iso ?? '';
    if (ad !== bd) return bd.localeCompare(ad);
    return a.name.localeCompare(b.name);
  });
}
