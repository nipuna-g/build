# Sheet writeback

How RIR and remark edits in the app get back into the source Google Sheet.

## Overview

The app loads sessions from a Google Sheets spreadsheet, renders them, and lets the user edit two fields per set/warmup row: **reps in reserve (RIR)** and **notes/remarks**. Edits are optimistic in the UI and written back to the spreadsheet via the Sheets API.

Everything is read-locally, write-on-edit — there's no continuous sync.

## End-to-end flow

```
       tap RIR/notes cell
              │
              ▼
   EditableText  ─── input, Enter / blur ───▶  onCommit(next)
   (components/EditableText.tsx)                    │
                                                    ▼
                                          SessionDetail.handleEdit
                                          (components/SessionDetail.tsx)
                                                    │
                                                    ▼
                                              commitEdit(args)
                                                 (edit.ts)
                                                    │
                                ┌───────────────────┼───────────────────┐
                                ▼                   ▼                   ▼
                          getCellRef()       applyOptimistic()      updateCell()
                            (edit.ts)            (App.tsx)           (google.ts)
                                │                   │                   │
                                │           applyPatchToSessions    PUT spreadsheets
                                │                (edit.ts)            /values/A1
                                │                   │                   │
                                │                   ▼                   ▼
                                │           React re-render         Sheets API
                                │           localStorage cache
                                ▼
                          CellRef from parser
                          (parser.ts → SetRow.cell)
```

## Pieces

### 1. Cell coordinates baked in at parse time

**File:** `src/parser.ts`, `src/types.ts`

Every parsed `SetRow` (and `WarmupRow`, which extends it) carries a `cell?: CellRef` describing where it came from in the spreadsheet:

```ts
interface CellRef {
  sheetName: string;   // e.g. "Block 1"
  row: number;         // 0-indexed grid row
  rirCol: number;      // 0-indexed column for RIR
  remarkCol: number;   // 0-indexed column for remark
}
```

This is the bridge from the in-memory model back to a specific cell. Rows parsed before this feature shipped (i.e. sessions hydrated from a stale `localStorage` cache) won't have a `cell`, and the UI marks them non-editable until the user hits **Reload**.

### 2. Auth + sheet ID persisted on first load

**File:** `src/source.ts`, written by `src/components/SheetConnect.tsx`

After a successful `loadFromId` we persist a `SheetSource` to `localStorage` under `build-tracker:source`:

```ts
interface SheetSource {
  spreadsheetId: string;
  accessToken: string;
  expiresAt: number;   // ms epoch
}
```

OAuth scopes requested: `spreadsheets` (write) + `drive.readonly` (for the Drive picker).

`isExpired(source, skewMs = 30_000)` adds 30s of skew to avoid using a token that's about to expire.

Calling `Reload` in the header (= `App.signOut`) clears both `build-tracker:source` and `build-tracker:sessions`, sending the user back to the connect screen.

### 3. Tap → input → commit

**File:** `src/components/EditableText.tsx`

A small reusable button/input swapper. On click it becomes a focused `<input>`. **Enter** or **blur** commits; **Esc** cancels. Calls `onCommit(next)` only if the value actually changed. Disabled state shows a tooltip "Reload sheet to enable editing" for rows without a `cell`.

### 4. Orchestration: `commitEdit`

**File:** `src/edit.ts`

The orchestrator is **pure** — it takes a `session`, a locator, the field name, prev/next values, and an `applyOptimistic` callback for state mutation. It returns a `CommitOutcome` discriminated union:

```ts
type CommitOutcome =
  | { ok: true }
  | { ok: false; reason: 'no-cell' | 'auth' | 'error'; message: string };
```

Caller (currently `SessionDetail`) handles the outcome: shows a toast on failure, flips `authError` state to surface a "Sign in" button when `reason === 'auth'`.

Sequence:
1. **Look up the cell** via `getCellRef(session, locator)`. None → `{ ok: false, reason: 'no-cell' }`.
2. **Load source** via `loadSource()`. Missing or expired → `{ ok: false, reason: 'auth' }`.
3. **Optimistic patch**: `applyOptimistic({ [field]: next || null })`. This bubbles up to `App.updateSet`, which calls `applyPatchToSessions` to immutably patch the right warmup or set. React re-renders; the existing `useEffect` rewrites the `localStorage` cache.
4. **PUT the cell** via `updateCell({ … })`.
5. On `SheetWriteAuthError` (401/403) or any other error: revert via `applyOptimistic({ [field]: prev })`, return the appropriate failure outcome.

### 5. The actual write

**File:** `src/google.ts` — `updateCell`

```
PUT https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}
    /values/'{sheetName}'!{A1col}{row+1}?valueInputOption=USER_ENTERED
Authorization: Bearer {accessToken}
Content-Type:  application/json

{ "values": [["<new value>"]] }
```

- `colToA1` converts a 0-indexed column to letters (`0 → A`, `25 → Z`, `26 → AA`, …).
- `valueInputOption=USER_ENTERED` makes Sheets parse the value the same way it would if you typed it in the browser, so `"2"` becomes a number and `"=A1+1"` becomes a formula.
- A 401 or 403 response throws `SheetWriteAuthError`. Any other non-OK throws a generic `Error` with the response body.

### 6. State propagation back to the rest of the app

**File:** `src/App.tsx` — `updateSet`

`applyPatchToSessions(sessions, sessionIndex, locator, patch)` does the immutable map/replace. The new array goes into the `view.sessions` state. The cache-syncing `useEffect` (already present for offline-first session caching) writes the updated array to `localStorage:build-tracker:sessions` automatically. So:

- The session detail re-renders with the new value.
- Any other view (exercise list, exercise detail) reflects the change on next render.
- A reload comes back from cache with the edited value intact.

## Failure modes

| Failure | Where caught | UX |
|---|---|---|
| No `cell` on set (stale cache) | `commitEdit` precheck | Toast: "Reload the sheet to enable editing." |
| No source or expired token | `commitEdit` precheck | Red toast + "Sign in" button → `onReauth` (= `App.signOut`) |
| Token rejected by Sheets (401/403) | `updateCell` throws `SheetWriteAuthError` | Revert + same "Sign in" toast |
| Other Sheets error | `updateCell` throws | Revert + `Failed to save: <body>` |
| Network down | `fetch` rejects | Revert + `Failed to save: <error message>` |

## File map

```
src/
├─ edit.ts                          ← writeback orchestration (commitEdit, applyPatchToSessions, types)
├─ source.ts                        ← localStorage for {spreadsheetId, accessToken, expiresAt}
├─ google.ts                        ← updateCell, SheetWriteAuthError, colToA1
├─ types.ts                         ← CellRef, SetRow.cell
├─ parser.ts                        ← populates SetRow.cell during parsing
├─ App.tsx                          ← updateSet (uses applyPatchToSessions)
└─ components/
   ├─ EditableText.tsx              ← tap/Enter/blur/Esc input swapper
   ├─ SessionDetail.tsx             ← handleEdit thunk → commitEdit
   └─ SheetConnect.tsx              ← saves SheetSource on successful load
```

## Adding a new editable field

1. Add the field to `SetRow` in `src/types.ts` if it doesn't exist.
2. Make sure the parser populates the column in `cell` (see `rirCol`/`remarkCol` in `parser.ts`).
3. Extend `EditField` in `src/edit.ts` and the column selection inside `commitEdit`.
4. Render an `<EditableText />` in `SessionDetail.tsx` wired to `handleEdit(locator, '<field>', prev, next)`.

That's it — the rest of the pipeline (optimistic patch, write, revert) handles it generically.
