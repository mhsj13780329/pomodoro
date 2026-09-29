'use client';

import { useEffect } from 'react';
import type { TimerEngine } from '@/domain/timer';
import { systemClock } from '@/platform/clock';
import type { TimerPersistence } from './persistence';

const REPAINT_MS = 250;

// The engine never schedules itself. This driver only decides when to call tick();
// correctness comes from timestamps, so throttled timers delay events, not the displayed time.
export function useTimerDriver(engine: TimerEngine | null, persistence: TimerPersistence | null, running: boolean) {
  useEffect(() => {
    if (!engine || !running) return;
    const tick = () => engine.tick();
    const interval = setInterval(tick, REPAINT_MS);
    const endsAt = engine.getState().endsAt;
    const wake = endsAt === null ? undefined : setTimeout(tick, Math.max(0, endsAt - systemClock.now()));
    return () => {
      clearInterval(interval);
      if (wake !== undefined) clearTimeout(wake);
    };
  }, [engine, running]);

  // Catch up the instant the user returns.
  useEffect(() => {
    if (!engine) return;
    const tick = () => engine.tick();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);
    window.addEventListener('pageshow', tick);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [engine]);

  // Save when the page is hidden or closing, so a running timer's elapsed time is captured.
  useEffect(() => {
    if (!persistence) return;
    const save = () => persistence.saveNow();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', save);
    };
  }, [persistence]);
}
