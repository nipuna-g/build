import type { CellRef, Session, SetRow } from './types';
import { SheetWriteAuthError, updateCell } from './google';
import { isExpired, loadSource } from './source';

export type EditField = 'rir' | 'remark';

export type SetLocator =
  | { kind: 'warmup'; warmupIndex: number }
  | {
      kind: 'superset';
      supersetIndex: number;
      exerciseIndex: number;
      setIndex: number;
    };

export function getCellRef(session: Session, locator: SetLocator): CellRef | undefined {
  if (locator.kind === 'warmup') {
    return session.warmups[locator.warmupIndex]?.cell;
  }
  return session.supersets[locator.supersetIndex]?.exercises[locator.exerciseIndex]?.sets[
    locator.setIndex
  ]?.cell;
}

export function applyPatchToSessions(
  sessions: Session[],
  sessionIndex: number,
  locator: SetLocator,
  patch: Partial<SetRow>,
): Session[] {
  return sessions.map((s, i) => {
    if (i !== sessionIndex) return s;
    if (locator.kind === 'warmup') {
      const warmups = s.warmups.map((w, j) =>
        j === locator.warmupIndex ? { ...w, ...patch } : w,
      );
      return { ...s, warmups };
    }
    const supersets = s.supersets.map((ss, j) => {
      if (j !== locator.supersetIndex) return ss;
      const exercises = ss.exercises.map((ex, k) => {
        if (k !== locator.exerciseIndex) return ex;
        const sets = ex.sets.map((set, l) =>
          l === locator.setIndex ? { ...set, ...patch } : set,
        );
        return { ...ex, sets };
      });
      return { ...ss, exercises };
    });
    return { ...s, supersets };
  });
}

export type CommitOutcome =
  | { ok: true }
  | { ok: false; reason: 'no-cell' | 'auth' | 'error'; message: string };

export interface CommitArgs {
  session: Session;
  locator: SetLocator;
  field: EditField;
  prev: string | null;
  next: string;
  applyOptimistic: (patch: Partial<SetRow>) => void;
}

export async function commitEdit(args: CommitArgs): Promise<CommitOutcome> {
  const { session, locator, field, prev, next, applyOptimistic } = args;

  const cell = getCellRef(session, locator);
  if (!cell) {
    return { ok: false, reason: 'no-cell', message: 'Reload the sheet to enable editing.' };
  }

  const source = loadSource();
  if (!source || isExpired(source)) {
    return { ok: false, reason: 'auth', message: 'Sign in again to save changes.' };
  }

  applyOptimistic({ [field]: next || null });

  const col = field === 'rir' ? cell.rirCol : cell.remarkCol;
  try {
    await updateCell({
      spreadsheetId: source.spreadsheetId,
      accessToken: source.accessToken,
      sheetName: cell.sheetName,
      row: cell.row,
      col,
      value: next,
    });
    return { ok: true };
  } catch (e) {
    applyOptimistic({ [field]: prev });
    if (e instanceof SheetWriteAuthError) {
      return { ok: false, reason: 'auth', message: 'Sign in again to save changes.' };
    }
    return {
      ok: false,
      reason: 'error',
      message: `Failed to save: ${(e as Error).message ?? 'unknown error'}`,
    };
  }
}
