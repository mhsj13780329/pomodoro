'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createLocalStore } from '@/data/local/localStore';
import { createSessionRepository } from '@/data/local/sessionRepository';
import { createSessionStore } from '@/data/session/sessionStore';
import { createTimerStateRepository } from '@/data/session/timerStateRepository';
import type { UserSettings } from '@/domain/settings';
import { localDateOf } from '@/domain/calendar';
import type { SessionRepository } from '@/domain/repositories';
import { countWorkSessionsOn, cycleProgress } from '@/domain/sessions/cycle';
import { createTimerEngine, timerConfigFromSettings } from '@/domain/timer';
import type { TimerEngine, TimerSnapshot } from '@/domain/timer';
import { playCompletionSound, unlockAudio } from '@/platform/audio/completionSound';
import { systemClock } from '@/platform/clock';
import { newId } from '@/platform/ids';
import { notificationPermission, requestNotificationPermission, showNotification } from '@/platform/notifications';
import { localTimeZone } from '@/platform/timeZone';
import { useT } from '@/application/providers/LocaleProvider';
import { useSettings } from '@/application/providers/SettingsProvider';
import { useTasks } from '@/application/providers/TasksProvider';
import { useToday } from '@/application/stats/TodayProvider';
import { useToast } from '@/application/providers/ToastProvider';
import { createCompletionHandler } from './completionHandler';
import { applyDevSeconds, parseDevSeconds } from './devOverrides';
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
 * Also wires engine events to the completion pipeline (record, sound, notification, toast).
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { settings, ready, updateSettings } = useSettings();
  const { t } = useT();
  const { showToast } = useToast();
  const { resolveSelectedTaskId } = useTasks();
  const { refresh: refreshToday } = useToday();
  const [engine, setEngine] = useState<TimerEngine | null>(null);
  const [persistence, setPersistence] = useState<TimerPersistence | null>(null);
  const [restoredPaused, setRestoredPaused] = useState(false);

  const settingsRef = useRef(settings);
  const tRef = useRef(t);
  const toastRef = useRef(showToast);
  const updateRef = useRef(updateSettings);
  const resolveTaskRef = useRef(resolveSelectedTaskId);
  const refreshTodayRef = useRef(refreshToday);
  const devSecondsRef = useRef<number | null>(null);
  const sessionsRef = useRef<SessionRepository | null>(null);
  useEffect(() => {
    settingsRef.current = settings;
    tRef.current = t;
    toastRef.current = showToast;
    updateRef.current = updateSettings;
    resolveTaskRef.current = resolveSelectedTaskId;
    refreshTodayRef.current = refreshToday;
  });

  const configFor = useCallback(
    (timer: UserSettings['timer']) => applyDevSeconds(timerConfigFromSettings(timer), devSecondsRef.current),
    [],
  );

  // Cycle counter: today's completed work sessions, read from shared storage (any tab).
  const countWorkToday = useCallback(async (): Promise<number> => {
    const repo = sessionsRef.current;
    if (!repo) return 0;
    const today = localDateOf(systemClock.now(), localTimeZone());
    return countWorkSessionsOn(await repo.listByLocalDate(today), today);
  }, []);

  // Boot once, after stored settings are loaded (the engine needs the real durations).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let detach: (() => void) | null = null;
    const repo = createTimerStateRepository(createSessionStore());
    const sessions = createSessionRepository(createLocalStore());
    sessionsRef.current = sessions;
    devSecondsRef.current = parseDevSeconds(window.location.search, process.env.NODE_ENV);
    const onEvent = createCompletionHandler({
      sessions,
      newId,
      timeZone: localTimeZone,
      getSelectedTaskId: () => resolveTaskRef.current(),
      getSettings: () => settingsRef.current,
      onSessionRecorded: () => refreshTodayRef.current(),
      effects: {
        playSound: playCompletionSound,
        notify: () =>
          showNotification(tRef.current('notification.workComplete.title'), tRef.current('notification.workComplete.body')),
        toast: () => toastRef.current(tRef.current('toast.workComplete')),
      },
    });
    void Promise.all([repo.load(), countWorkToday()]).then(([persisted, count]) => {
      if (cancelled) return;
      const s = settingsRef.current.timer;
      const created = createTimerEngine({
        clock: systemClock,
        config: configFor(s),
        restore: persisted,
        completedWorkInCycle: cycleProgress(count, s.sessionsBeforeLongBreak),
        onEvent,
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
  }, [ready, configFor, countWorkToday]);

  // Duration changes apply to the next session only (the engine enforces it).
  useEffect(() => {
    engine?.updateConfig(configFor(settings.timer));
  }, [engine, settings.timer, configFor]);

  // useSyncExternalStore requires getSnapshot to return the same value until the store
  // notifies. The engine recomputes remainingMs from the clock on every call, so a render that
  // straddles a millisecond would see two different snapshots and loop. Cache per notification.
  const store = useMemo(() => {
    if (!engine) return null;
    let current = engine.getSnapshot();
    return {
      subscribe: (cb: () => void) => {
        const unsub = engine.subscribe(() => {
          current = engine.getSnapshot();
          cb();
        });
        const fresh = engine.getSnapshot();
        if (fresh !== current) {
          current = fresh;
          cb();
        }
        return unsub;
      },
      getSnapshot: () => current,
    };
  }, [engine]);

  const snapshot = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getSnapshot : () => null,
    () => null,
  );

  useTimerDriver(engine, persistence, snapshot?.status === 'running');

  const start = useCallback(() => {
    if (!engine) return;
    setRestoredPaused(false);
    // Both need a user gesture, so they run synchronously here, before any await.
    unlockAudio();
    const firstAsk = notificationPermission() === 'default';
    void requestNotificationPermission().then((state) => {
      // Temporary until the settings toggle (M16): a grant on the first ask enables notifications.
      if (firstAsk && state === 'granted') updateRef.current({ notifications: { browser: true } });
    });
    // Re-derive the cycle counter from today's sessions right before the session begins.
    void countWorkToday().then((count) => {
      engine.setCompletedWorkInCycle(cycleProgress(count, settingsRef.current.timer.sessionsBeforeLongBreak));
      engine.start();
    });
  }, [engine, countWorkToday]);
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
