import { useState } from 'react';
import type { Session } from './types';
import SheetConnect from './components/SheetConnect';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';

type View =
  | { kind: 'connect' }
  | { kind: 'list'; sessions: Session[] }
  | { kind: 'detail'; sessions: Session[]; index: number };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'connect' });

  if (view.kind === 'connect') {
    return <SheetConnect onLoad={(sessions) => setView({ kind: 'list', sessions })} />;
  }

  if (view.kind === 'list') {
    return (
      <SessionList
        sessions={view.sessions}
        onSelect={(index) => setView({ kind: 'detail', sessions: view.sessions, index })}
      />
    );
  }

  return (
    <SessionDetail
      session={view.sessions[view.index]}
      onBack={() => setView({ kind: 'list', sessions: view.sessions })}
    />
  );
}
