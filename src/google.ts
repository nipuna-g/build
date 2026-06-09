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
