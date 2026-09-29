'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createLocalStore } from '@/data/local/localStore';
import { createSessionRepository } from '@/data/local/sessionRepository';
import { localDateOf, weekStartFor } from '@/domain/calendar';
import type { PomodoroSession } from '@/domain/sessions/types';
import { activityGrid, longTermSummary, weeklySummary } from '@/domain/stats';
import { systemClock } from '@/platform/clock';
import { localTimeZone } from '@/platform/timeZone';
import { useSettings } from '../providers/SettingsProvider';
import { useTasks } from '../providers/TasksProvider';

export const HEATMAP_WEEKS = 12;

/**
 * Everything the statistics page shows, derived from stored sessions and tasks.
 * Nothing is cached. Reloads when the tab becomes visible again.
 */
export function useStatsData() {
  const { settings } = useSettings();
  const { tasks, ready: tasksReady } = useTasks();
  const [sessions, setSessions] = useState<PomodoroSession[] | null>(null);
  const [today, setToday] = useState<string | null>(null);

  const load = useCallback(() => {
    const date = localDateOf(systemClock.now(), localTimeZone());
    void createSessionRepository(createLocalStore())
      .listAll()
      .then((all) => {
        setSessions(all);
        setToday(date);
      });
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // Only the week start depends on the calendar; totals never do.
  const weekStart = weekStartFor(settings.calendar.primary);

  return useMemo(() => {
    if (!sessions || !today || !tasksReady) return null;
    return {
      today,
      weekly: weeklySummary(sessions, today, weekStart),
      longTerm: longTermSummary(sessions, tasks, today, weekStart),
      grid: activityGrid(sessions, today, HEATMAP_WEEKS, weekStart),
    };
  }, [sessions, today, tasks, tasksReady, weekStart]);
}
