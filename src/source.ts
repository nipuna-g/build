export interface SheetSource {
  spreadsheetId: string;
  accessToken: string;
  expiresAt: number;
}

const KEY = 'build-tracker:source';

export function saveSource(s: SheetSource): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadSource(): SheetSource | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SheetSource>;
    if (
      typeof parsed.spreadsheetId === 'string' &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as SheetSource;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSource(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isExpired(s: SheetSource, skewMs: number = 30_000): boolean {
  return Date.now() + skewMs >= s.expiresAt;
}
