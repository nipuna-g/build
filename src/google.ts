export interface SheetMeta {
  sheetId: number;
  title: string;
  index: number;
}

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function fetchSheetMetadata(
  spreadsheetId: string,
  accessToken: string,
): Promise<SheetMeta[]> {
  const url = `${API_BASE}/${spreadsheetId}?fields=sheets.properties.sheetId,sheets.properties.title,sheets.properties.index`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata (${res.status}): ${body}`);
  }
  const data = await res.json();
  return (data.sheets || []).map((sh: { properties: SheetMeta }) => ({
    sheetId: sh.properties.sheetId,
    title: sh.properties.title,
    index: sh.properties.index ?? 0,
  }));
}

export class SheetWriteAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetWriteAuthError';
  }
}

function colToA1(col: number): string {
  let n = col + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function updateCell(opts: {
  spreadsheetId: string;
  accessToken: string;
  sheetName: string;
  row: number;
  col: number;
  value: string;
}): Promise<void> {
  const { spreadsheetId, accessToken, sheetName, row, col, value } = opts;
  const a1 = `'${sheetName.replace(/'/g, "''")}'!${colToA1(col)}${row + 1}`;
  const url = `${API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    a1,
  )}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new SheetWriteAuthError(`Auth expired (${res.status}). Sign in again.`);
    }
    throw new Error(`Update failed (${res.status}): ${body}`);
  }
}

export async function fetchSheetsValues(
  spreadsheetId: string,
  sheetNames: string[],
  accessToken: string,
): Promise<Array<{ name: string; values: string[][] }>> {
  if (sheetNames.length === 0) return [];
  const params = new URLSearchParams();
  for (const name of sheetNames) params.append('ranges', `'${name.replace(/'/g, "''")}'`);
  params.append('valueRenderOption', 'FORMATTED_VALUE');
  params.append('majorDimension', 'ROWS');

  const url = `${API_BASE}/${spreadsheetId}/values:batchGet?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch sheet values (${res.status}): ${body}`);
  }
  const data = await res.json();
  const ranges = data.valueRanges || [];
  return sheetNames.map((name, i) => ({
    name,
    values: (ranges[i]?.values || []) as string[][],
  }));
}
