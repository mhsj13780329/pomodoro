import { weekDates, type WeekStart } from '../calendar/gregorian';
import type { PomodoroSession } from '../sessions/types';
import { totalsByDate } from './group';
import type { WeekDay, WeeklySummary } from './types';

/** The calendar week containing `date`; the caller supplies the week start. */
export function weeklySummary(
  sessions: readonly PomodoroSession[],
  date: string,
  weekStart: WeekStart,
): WeeklySummary {
  const byDate = new Map(totalsByDate(sessions).map((d) => [d.date, d]));
  const raw = weekDates(date, weekStart).map((d) => ({
    date: d,
    pomodoros: byDate.get(d)?.pomodoros ?? 0,
    focusMs: byDate.get(d)?.focusMs ?? 0,
  }));
  const max = Math.max(0, ...raw.map((d) => d.pomodoros));
  const days: WeekDay[] = raw.map((d) => ({
    ...d,
    level: max === 0 || d.pomodoros === 0 ? 0 : (Math.ceil((4 * d.pomodoros) / max) as 1 | 2 | 3 | 4),
  }));
  return {
    days,
    totalPomodoros: days.reduce((n, d) => n + d.pomodoros, 0),
    totalFocusMs: days.reduce((n, d) => n + d.focusMs, 0),
  };
}
