'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@matemagico/ui';
import { formatClock } from '../lib/format';

export interface QuestionTimerProps {
  /** ISO date at which the attempt ends (startedAt + durationMinutes, computed by the API). */
  expiresAt: string;
  onExpire: () => void;
  now?: () => number;
}

export function QuestionTimer({ expiresAt, onExpire, now = Date.now }: QuestionTimerProps) {
  const target = Date.parse(expiresAt);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((target - now()) / 1000)));
  const fired = useRef(false);
  const expire = useRef(onExpire);

  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((target - now()) / 1000));
      setRemaining(left);
      if (left === 0 && !fired.current) {
        fired.current = true;
        expire.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, now]);

  return (
    <div
      role="timer"
      aria-label="Tempo restante"
      className={cn(
        'rounded-lg border px-3 py-2 text-center font-mono text-lg font-semibold',
        remaining <= 60 ? 'border-rose-500 text-rose-200' : 'border-slate-600 text-slate-100',
      )}
    >
      <span className="sr-only">Tempo restante: </span>
      {formatClock(remaining)}
    </div>
  );
}
