import { useEffect, useState } from 'react';
import type { Session } from './types';
import SheetConnect from './components/SheetConnect';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';
import ExerciseList from './components/ExerciseList';
import ExerciseDetail from './components/ExerciseDetail';
import type { Tab } from './components/TabBar';

type View =
  | { kind: 'connect' }
  | { kind: 'list'; sessions: Session[]; tab: Tab }
  | { kind: 'exercise'; sessions: Session[]; name: string }
  | { kind: 'detail'; sessions: Session[]; index: number; tab: Tab; exerciseName?: string };

const CACHE_KEY = 'build-tracker:sessions';

function loadCached(): Session[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState<View>(() => {
    const cached = loadCached();
    return cached
      ? { kind: 'list', sessions: cached, tab: 'sessions' }
      : { kind: 'connect' };
  });

  useEffect(() => {
    if (view.kind !== 'connect') {
      const sessions =
        view.kind === 'list' || view.kind === 'exercise' || view.kind === 'detail'
          ? view.sessions
          : null;
      if (sessions) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(sessions));
        } catch {
          /* quota or private mode — ignore */
        }
      }
    }
  }, [view]);

  const signOut = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
    setView({ kind: 'connect' });
  };

  if (view.kind === 'connect') {
    return <SheetConnect onLoad={(sessions) => setView({ kind: 'list', sessions, tab: 'sessions' })} />;
  }

  if (view.kind === 'list') {
    if (view.tab === 'exercises') {
      return (
        <ExerciseList
          sessions={view.sessions}
          onTabChange={(tab) => setView({ kind: 'list', sessions: view.sessions, tab })}
          onSelectExercise={(name) => setView({ kind: 'exercise', sessions: view.sessions, name })}
          onReload={signOut}
        />
      );
    }
    return (
      <SessionList
        sessions={view.sessions}
        onSelect={(index) =>
          setView({ kind: 'detail', sessions: view.sessions, index, tab: 'sessions' })
        }
        onTabChange={(tab) => setView({ kind: 'list', sessions: view.sessions, tab })}
        onReload={signOut}
      />
    );
  }

  if (view.kind === 'exercise') {
    return (
      <ExerciseDetail
        sessions={view.sessions}
        exerciseName={view.name}
        onBack={() => setView({ kind: 'list', sessions: view.sessions, tab: 'exercises' })}
        onSelectSession={(index) =>
          setView({
            kind: 'detail',
            sessions: view.sessions,
            index,
            tab: 'exercises',
            exerciseName: view.name,
          })
        }
      />
    );
  }

  return (
    <SessionDetail
      session={view.sessions[view.index]}
      sessions={view.sessions}
      sessionIndex={view.index}
      onBack={() =>
        view.exerciseName
          ? setView({ kind: 'exercise', sessions: view.sessions, name: view.exerciseName })
          : setView({ kind: 'list', sessions: view.sessions, tab: view.tab })
      }
    />
  );
}
