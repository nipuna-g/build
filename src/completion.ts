import { useEffect, useState } from 'react';

const KEY = 'build-tracker:completed-sets';

export type CompletionMap = Record<string, true>;

export function setKey(sessionIndex: number, slot: string, setIndex: number): string {
  return `${sessionIndex}|${slot}|${setIndex}`;
}

export function warmupKey(sessionIndex: number, warmupIndex: number): string {
  return `${sessionIndex}|wu|${warmupIndex}`;
}

function load(): CompletionMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CompletionMap) : {};
  } catch {
    return {};
  }
}

function save(map: CompletionMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function useCompletion() {
  const [map, setMap] = useState<CompletionMap>(() => load());

  useEffect(() => {
    save(map);
  }, [map]);

  const toggle = (key: string) => {
    setMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  return { map, toggle };
}
