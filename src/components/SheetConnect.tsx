import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { extractSpreadsheetId, fetchSheetMetadata, fetchSheetsValues } from '../google';
import { parseAll } from '../parser';
import { openSpreadsheetPicker } from '../picker';
import { saveSource } from '../source';
import type { Session } from '../types';

interface Props {
  onLoad: (sessions: Session[]) => void;
}

type Mode = 'picker' | 'url';

export default function SheetConnect({ onLoad }: Props) {
  const [mode, setMode] = useState<Mode>('picker');
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [showUrl, setShowUrl] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  async function loadFromId(id: string, token: { access_token: string; expires_in?: number }) {
    const accessToken = token.access_token;
    setStage('Fetching sheet metadata…');
    const meta = await fetchSheetMetadata(id, accessToken);
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
      accessToken,
    );

    setStage('Parsing sessions…');
    const sessions = parseAll(sheets);
    if (sessions.length === 0) {
      throw new Error('No sessions found after parsing. Check the sheet format.');
    }
    saveSource({
      spreadsheetId: id,
      accessToken,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    });
    onLoad(sessions);
  }

  const login = useGoogleLogin({
    scope:
      'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
    onSuccess: async (token) => {
      try {
        setError(null);
        setLoading(true);

        let id: string | null = null;
        if (mode === 'picker') {
          if (!apiKey) {
            throw new Error('Missing VITE_GOOGLE_API_KEY — required for the Drive picker.');
          }
          setStage('Opening Drive picker…');
          const picked = await openSpreadsheetPicker({
            accessToken: token.access_token,
            apiKey,
          });
          if (!picked) {
            setLoading(false);
            setStage('');
            return;
          }
          id = picked.id;
        } else {
          id = extractSpreadsheetId(sheetUrl);
          if (!id) throw new Error('Could not extract spreadsheet ID from URL');
        }

        await loadFromId(id, token);
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

  const start = (next: Mode) => {
    setMode(next);
    setError(null);
    login();
  };

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
          Sign in with Google and choose your workout sheet from Drive.
        </p>

        <button
          onClick={() => start('picker')}
          disabled={loading || !apiKey}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          {loading && mode === 'picker' ? (stage || 'Loading…') : 'Choose from Google Drive'}
        </button>

        {!apiKey && (
          <p className="mt-2 text-xs text-zinc-500 text-center">
            Set <code className="text-violet-400">VITE_GOOGLE_API_KEY</code> in <code className="text-violet-400">.env</code> to enable the Drive picker.
          </p>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowUrl((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {showUrl ? 'Hide URL option' : 'Or paste a sheet URL'}
          </button>
        </div>

        {showUrl && (
          <div className="mt-4">
            <label className="block text-zinc-300 text-sm font-medium mb-2">Spreadsheet URL</label>
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <button
              onClick={() => start('url')}
              disabled={loading || !sheetUrl.trim()}
              className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
            >
              {loading && mode === 'url' ? (stage || 'Loading…') : 'Load from URL'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
