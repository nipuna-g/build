import { useEffect, useRef, useState } from 'react';

export function parseDurationSeconds(rep: string | null): number | null {
  if (!rep) return null;
  const m = rep.trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  return unit.startsWith('m') ? Math.round(n * 60) : Math.round(n);
}

function format(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

function beep() {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    /* ignore */
  }
}

interface Props {
  seconds: number;
  label: string;
}

export default function DurationTimer({ seconds, label }: Props) {
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const end = endAtRef.current;
      if (end === null) return;
      const left = end - performance.now();
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        endAtRef.current = null;
        navigator.vibrate?.([200, 100, 200, 100, 400]);
        beep();
        return;
      }
      setRemainingMs(left);
    };
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    endAtRef.current = performance.now() + remainingMs;
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    endAtRef.current = null;
    setRemainingMs(seconds * 1000);
  };
  const onClick = () => {
    if (running) reset();
    else if (remainingMs <= 0) {
      setRemainingMs(seconds * 1000);
      endAtRef.current = performance.now() + seconds * 1000;
      setRunning(true);
    } else start();
  };

  const display = running ? format(remainingMs / 1000) : label;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium tabular-nums transition-colors ${
        running
          ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
          : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 border border-zinc-600'
      }`}
      title={running ? 'Stop' : 'Start timer'}
    >
      <span aria-hidden>{running ? '■' : '▶'}</span>
      {display}
    </button>
  );
}
