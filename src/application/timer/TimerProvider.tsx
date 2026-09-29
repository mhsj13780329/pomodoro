'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createSessionStore } from '@/data/session/sessionStore';
import { createTimerStateRepository } from '@/data/session/timerStateRepository';
import { cycleProgress } from '@/domain/sessions/cycle';
import { createTimerEngine, timerConfigFromSettings } from '@/domain/timer';
import type { TimerEngine, TimerSnapshot } from '@/domain/timer';
import { systemClock } from '@/platform/clock';
import { useSettings } from '@/application/providers/SettingsProvider';
import { attachTimerPersistence } from './persistence';
import type { TimerPersistence } from './persistence';
import { useTimerDriver } from './useTimerDriver';

export interface TimerContextValue {
  /** Null until settings and this tab's saved state have loaded. */
  snapshot: TimerSnapshot | null;
  /** True when the timer came back paused after a reload and the user has not acted yet. */
  restoredPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const noopSubscribe = () => () => {};

/**
 * Mounted in the root layout so the engine survives navigation between routes.
 * `getCompletedWorkToday` is the cycle-counter input; it returns 0 until real sessions exist (M6).
 */
export function TimerProvider({
  children,
  getCompletedWorkToday = () => 0,
}: {
  children: ReactNode;
  getCompletedWorkToday?: () => number;
}) {
  const { settings, ready } = useSettings();
  const [engine, setEngine] = useState<TimerEngine | null>(null);
  const [persistence, setPersistence] = useState<TimerPersistence | null>(null);
  const [restoredPaused, setRestoredPaused] = useState(false);

  const settingsRef = useRef(settings);
  const countRef = useRef(getCompletedWorkToday);
  useEffect(() => {
    settingsRef.current = settings;
    countRef.current = getCompletedWorkToday;
  });

  // Boot once, after stored settings are loaded (the engine needs the real durations).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let detach: (() => void) | null = null;
    const repo = createTimerStateRepository(createSessionStore());
    void repo.load().then((persisted) => {
      if (cancelled) return;
      const s = settingsRef.current.timer;
      const created = createTimerEngine({
        clock: systemClock,
        config: timerConfigFromSettings(s),
        restore: persisted,
        completedWorkInCycle: cycleProgress(countRef.current(), s.sessionsBeforeLongBreak),
      });
      const attached = attachTimerPersistence({ engine: created, repo, clock: systemClock });
      detach = attached.dispose;
      setRestoredPaused(persisted !== null && persisted.status !== 'idle' && created.getState().status === 'paused');
      setEngine(created);
      setPersistence(attached);
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [ready]);

  // Duration changes apply to the next session only (the engine enforces it).
  useEffect(() => {
    engine?.updateConfig(timerConfigFromSettings(settings.timer));
  }, [engine, settings.timer]);

  const snapshot = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    () => (engine ? engine.getSnapshot() : null),
    () => null,
  );

  useTimerDriver(engine, persistence, snapshot?.status === 'running');

  const start = useCallback(() => {
    if (!engine) return;
    setRestoredPaused(false);
    engine.setCompletedWorkInCycle(
      cycleProgress(countRef.current(), settingsRef.current.timer.sessionsBeforeLongBreak),
    );
    engine.start();
  }, [engine]);
  const pause = useCallback(() => engine?.pause(), [engine]);
  const resume = useCallback(() => {
    setRestoredPaused(false);
    engine?.resume();
  }, [engine]);
  const reset = useCallback(() => {
    setRestoredPaused(false);
    engine?.reset();
  }, [engine]);
  const skip = useCallback(() => {
    setRestoredPaused(false);
    engine?.skip();
  }, [engine]);

  const value = useMemo(
    () => ({ snapshot, restoredPaused, start, pause, resume, reset, skip }),
    [snapshot, restoredPaused, start, pause, resume, reset, skip],
  );
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
  return ctx;
}
