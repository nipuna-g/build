import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { extractSpreadsheetId, fetchSheetMetadata, fetchSheetsValues } from '../google';
import { parseAll } from '../parser';
import type { Session } from '../types';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1yvPABdi49FzZ3HzsdEa_2I6IU_P9-r37ZYHiLT4jxys/edit';

interface Props {
  onLoad: (sessions: Session[]) => void;
}

export default function SheetConnect({ onLoad }: Props) {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    onSuccess: async (token) => {
      try {
        setError(null);
        setLoading(true);
        const id = extractSpreadsheetId(sheetUrl);
        if (!id) throw new Error('Could not extract spreadsheet ID from URL');

        setStage('Fetching sheet metadata…');
        const meta = await fetchSheetMetadata(id, token.access_token);
        const blockSheets = meta
          .filter((s) => /^Block\s*\d+$/.test(s.title))
          .sort((a, b) => a.index - b.index);
        if (blockSheets.length === 0) {
          throw new Error('No "Block N" sheets found in this spreadsheet');
        }

        setStage(`Fetching ${blockSheets.length} block sheets…`);
        const sheets = await fetchSheetsValues(
          id,
          blockSheets.map((s) => s.title),
          token.access_token,
        );

        setStage('Parsing sessions…');
        const sessions = parseAll(sheets);
        if (sessions.length === 0) {
          throw new Error('No sessions found after parsing. Check the sheet format.');
        }
        onLoad(sessions);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setStage('');
      }
    },
    onError: (err) => {
      setError(`Sign-in failed: ${err.error_description ?? err.error ?? 'unknown error'}`);
      setLoading(false);
    },
  });

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg px-6">
          <h1 className="text-2xl font-bold text-white mb-3">Setup required</h1>
          <p className="text-zinc-400 mb-4">
            Missing <code className="text-violet-400">VITE_GOOGLE_CLIENT_ID</code> environment variable.
          </p>
          <ol className="text-zinc-400 text-sm space-y-2 list-decimal list-inside">
            <li>Create a Google Cloud project</li>
            <li>Enable the Google Sheets API</li>
            <li>Create an OAuth 2.0 Client ID (Web application)</li>
            <li>Add <code className="text-violet-400">http://localhost:5174</code> to Authorized JavaScript origins</li>
            <li>Copy the client ID into <code className="text-violet-400">.env</code> as <code className="text-violet-400">VITE_GOOGLE_CLIENT_ID</code></li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-5xl mb-6 text-center">🏋️</div>
        <h1 className="text-3xl font-bold text-white mb-2 text-center">BUILD Tracker</h1>
        <p className="text-zinc-400 mb-8 text-center text-sm">
          Sign in with Google to load your workout sheet.
        </p>

        <label className="block text-zinc-300 text-sm font-medium mb-2">Spreadsheet URL</label>
        <input
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />

        <button
          onClick={() => login()}
          disabled={loading}
          className="mt-6 w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          {loading ? (stage || 'Loading…') : 'Sign in with Google'}
        </button>

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
