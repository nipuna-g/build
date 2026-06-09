import type { Session, Superset, Exercise, SetRow, WarmupRow } from './types';

type Grid = string[][];

const SLOT_RE = /^\(?\s*([0-9]+)\s*([A-Za-z])\s*\)/;
const WEEK_RE = /Week:\s*(\d+)/i;
const SESS_RE = /Session:\s*(\d+)/i;
const DATE_RE = /Date:\s*([\s\S]*)/i;
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function s(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str || null;
}

function getCell(grid: Grid, row: number, col: number): string | null {
  if (row < 0 || row >= grid.length) return null;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return null;
  return s(r[col]);
}

function makeIso(y: number, monIdx: number, day: number): string | null {
  const d = new Date(y, monIdx, day);
  if (d.getFullYear() !== y || d.getMonth() !== monIdx || d.getDate() !== day) return null;
  return `${y}-${String(monIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(raw: string | null, fallbackYears: number[]): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*,?\s*(\d{4})?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monIdx = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (monIdx < 0) return null;

  if (m[3]) return makeIso(parseInt(m[3], 10), monIdx, day);

  for (const y of fallbackYears) {
    const iso = makeIso(y, monIdx, day);
    if (iso) return iso;
  }
  return null;
}

function splitExerciseCell(cellText: string | null): [string | null, string | null, string | null] {
  if (!cellText) return [null, null, null];
  let raw = cellText.trim();
  let slot: string | null = null;
  const m = raw.match(SLOT_RE);
  if (m) {
    slot = `${m[1]}${m[2].toUpperCase()}`;
    raw = raw.slice(m[0].length).trim();
  }
  let lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let detail: string | null = null;
  const last = lines[lines.length - 1];
  if (last && last.startsWith('(') && last.endsWith(')')) {
    detail = last.slice(1, -1).trim();
    lines = lines.slice(0, -1);
  }
  let name: string | null = lines.join(' ').trim() || null;
  if (detail === null && name) {
    const m2 = name.match(/\(([^()]*)\)\s*$/);
    if (m2 && m2.index !== undefined) {
      detail = m2[1].trim();
      name = name.slice(0, m2.index).trim() || null;
    }
  }
  return [slot, name, detail];
}

interface ColMap {
  set: number;
  weight: number;
  rep: number;
  rir: number;
  remark: number;
  coachRemark: number;
  remarkScan: number[];
}

function maxCol(grid: Grid): number {
  return grid.reduce((m, r) => Math.max(m, r.length), 0);
}

function findColMap(grid: Grid, hdrRow: number): ColMap {
  const cols: Partial<ColMap> = {};
  const mc = maxCol(grid);
  for (let c = 0; c < mc; c++) {
    const v = getCell(grid, hdrRow, c);
    if (!v) continue;
    const key = v.toLowerCase();
    if (key === 'set') cols.set = c;
    else if (key === 'weight') cols.weight = c;
    else if (key === 'rep') cols.rep = c;
    else if (key === 'rir') cols.rir = c;
    else if (key === 'remarks' && cols.remark === undefined) cols.remark = c;
    else if (key === "coach's remarks") cols.coachRemark = c;
  }
  // Python defaults (1-indexed) translated to 0-indexed
  const set = cols.set ?? 2;
  const weight = cols.weight ?? 3;
  const rep = cols.rep ?? 5;
  const rir = cols.rir ?? 6;
  const remark = cols.remark ?? 7;
  const coachRemark = cols.coachRemark ?? 10;

  let remarkScan: number[] = [];
  for (let c = rir + 1; c < coachRemark; c++) remarkScan.push(c);
  if (remarkScan.length === 0) remarkScan = [remark];

  return { set, weight, rep, rir, remark, coachRemark, remarkScan };
}

export function parseSheet(grid: Grid, blockName: string): Session[] {
  const rows = grid.length;
  let blkFrom: string | null = null;
  let blkTo: string | null = null;
  const blkYears: number[] = [];

  const headerScanLimit = Math.min(rows, 30);
  for (let r = 0; r < headerScanLimit; r++) {
    if (getCell(grid, r, 0) === 'Block Date') {
      blkFrom = getCell(grid, r, 1);
      blkTo = getCell(grid, r, 2);
      for (const dateStr of [blkFrom, blkTo]) {
        if (!dateStr) continue;
        const ym = dateStr.match(/\b(20\d{2})\b/);
        if (ym) {
          const y = parseInt(ym[1], 10);
          if (!blkYears.includes(y)) blkYears.push(y);
        }
      }
      break;
    }
  }

  const sessions: Session[] = [];
  let r = 0;
  while (r < rows) {
    const a = getCell(grid, r, 0);
    if (a && WEEK_RE.test(a) && SESS_RE.test(a)) {
      const [sess, nextR] = parseSession(grid, r, blockName, blkFrom, blkTo, blkYears);
      if (sess) sessions.push(sess);
      r = nextR;
      continue;
    }
    r++;
  }
  return sessions;
}

function parseSession(
  grid: Grid,
  startRow: number,
  blockName: string,
  blkFrom: string | null,
  blkTo: string | null,
  blkYears: number[],
): [Session | null, number] {
  const rows = grid.length;
  const hdr = getCell(grid, startRow, 0) ?? '';
  const wm = hdr.match(WEEK_RE);
  const sm = hdr.match(SESS_RE);
  const week = wm ? parseInt(wm[1], 10) : null;
  const sessNo = sm ? parseInt(sm[1], 10) : null;
  const dm = hdr.match(DATE_RE);
  const dateRaw = dm ? dm[1].trim() : null;
  const dateIso = parseDate(dateRaw, blkYears);

  let r = startRow + 1;
  let coach: string | null = null;
  while (r < rows) {
    const v = getCell(grid, r, 0);
    if (v && v.toLowerCase().startsWith('coach')) {
      coach = v.replace(/^coach\s*/i, '').trim() || null;
      r++;
      break;
    }
    if (v === 'Exercise/s') break;
    r++;
  }

  while (r < rows && getCell(grid, r, 0) !== 'Exercise/s') r++;
  if (r >= rows) return [null, startRow + 1];

  const cols = findColMap(grid, r);
  r++;

  const warmups: WarmupRow[] = [];
  const supersetGroups: Superset[] = [];
  const groupIndex: Record<string, Superset> = {};
  let currentEx: Exercise | null = null;

  while (r < rows) {
    const a = getCell(grid, r, 0);
    if (a && WEEK_RE.test(a) && SESS_RE.test(a)) break;

    const setLabel = getCell(grid, r, cols.set);
    const weight = getCell(grid, r, cols.weight);
    const rep = getCell(grid, r, cols.rep);
    const rir = getCell(grid, r, cols.rir);
    let remark: string | null = null;
    for (const rc of cols.remarkScan) {
      const v = getCell(grid, r, rc);
      if (v) { remark = v; break; }
    }
    const coachRemark = getCell(grid, r, cols.coachRemark);

    if (!a && !setLabel && !weight && !rep && !rir && !remark && !coachRemark) {
      currentEx = null;
      r++;
      continue;
    }

    if (a) {
      const [slot, name, detail] = splitExerciseCell(a);
      const setRow: SetRow = { set: setLabel, weight, rep, rir, remark };
      if (slot === null) {
        warmups.push({ exercise: name, ...setRow });
        currentEx = null;
      } else {
        const grp = slot.slice(0, -1);
        const ex: Exercise = {
          slot,
          name,
          detail,
          coach_remark: coachRemark,
          sets: [],
        };
        if (setLabel || weight || rep || rir || remark) ex.sets.push(setRow);
        if (!groupIndex[grp]) {
          groupIndex[grp] = { group: grp, exercises: [] };
          supersetGroups.push(groupIndex[grp]);
        }
        groupIndex[grp].exercises.push(ex);
        currentEx = ex;
      }
    } else if (currentEx !== null) {
      if (currentEx.coach_remark === null && coachRemark) {
        currentEx.coach_remark = coachRemark;
      }
      currentEx.sets.push({ set: setLabel, weight, rep, rir, remark });
    }
    r++;
  }

  return [
    {
      block: blockName,
      block_date_from: blkFrom,
      block_date_to: blkTo,
      week,
      session: sessNo,
      date_raw: dateRaw,
      date_iso: dateIso,
      coach,
      warmups,
      supersets: supersetGroups,
    },
    r,
  ];
}

export function parseAll(sheets: Array<{ name: string; values: Grid }>): Session[] {
  const result: Session[] = [];
  for (const { name, values } of sheets) {
    if (!/^Block\s*\d+$/.test(name)) continue;
    result.push(...parseSheet(values, name));
  }
  return result;
}
