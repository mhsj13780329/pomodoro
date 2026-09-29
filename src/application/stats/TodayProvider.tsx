'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createLocalStore } from '@/data/local/localStore';
import { createSessionRepository } from '@/data/local/sessionRepository';
import { localDateOf } from '@/domain/calendar';
import type { SessionRepository } from '@/domain/repositories';
import { dailySummary } from '@/domain/stats';
import type { DailySummary } from '@/domain/stats';
import { systemClock } from '@/platform/clock';
import { localTimeZone } from '@/platform/timeZone';
import { useTasks } from '../providers/TasksProvider';

interface TodayContextValue {
  /** Null until the first load. */
  today: DailySummary | null;
  /** Re-reads today's sessions (called after a Pomodoro is recorded). */
  refresh: () => void;
}

const TodayContext = createContext<TodayContextValue | null>(null);

/** Today's numbers, derived from stored sessions and tasks. Nothing is cached in storage. */
export function TodayProvider({ children }: { children: ReactNode }) {
  const { tasks, ready } = useTasks();
  const [today, setToday] = useState<DailySummary | null>(null);
  const repo = useRef<SessionRepository | null>(null);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  });

  const refresh = useCallback(() => {
    repo.current ??= createSessionRepository(createLocalStore());
    const zone = localTimeZone();
    const date = localDateOf(systemClock.now(), zone);
    void repo.current.listByLocalDate(date).then((sessions) => {
      setToday(dailySummary(sessions, tasksRef.current, date, zone));
    });
  }, []);

  // Tasks changing (complete, reopen, delete) changes completed-task count.
  useEffect(() => {
    if (ready) refresh();
  }, [ready, tasks, refresh]);

  // Coming back to the tab also handles the day rolling over and sessions from other tabs.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const value = useMemo(() => ({ today, refresh }), [today, refresh]);
  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}

export function useToday(): TodayContextValue {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used inside TodayProvider');
  return ctx;
}
