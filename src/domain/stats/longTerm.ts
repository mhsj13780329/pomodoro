import { addDays, daysBetween, startOfWeek, type WeekStart } from '../calendar/gregorian';
import type { PomodoroSession } from '../sessions/types';
import type { Task } from '../tasks/types';
import { totalsByDate } from './group';
import { currentStreak, longestStreak } from './streaks';
import type { LongTermSummary, Trend } from './types';

function focusBetween(history: { date: string; focusMs: number }[], from: string, to: string): number {
  return history.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + d.focusMs, 0);
}

export function longTermSummary(
  sessions: readonly PomodoroSession[],
  tasks: readonly Task[],
  today: string,
  weekStart: WeekStart,
): LongTermSummary {
  const history = totalsByDate(sessions);
  const totalFocusMs = history.reduce((n, d) => n + d.focusMs, 0);
  const totalPomodoros = history.reduce((n, d) => n + d.pomodoros, 0);

  const days = history.length === 0 ? 0 : Math.max(1, daysBetween(history[0].date, today) + 1);
  const weeks = Math.max(1, Math.ceil(days / 7));

  const thisStart = startOfWeek(today, weekStart);
  const lastStart = addDays(thisStart, -7);
  const thisWeekMs = focusBetween(history, thisStart, addDays(thisStart, 6));
  const lastWeekMs = focusBetween(history, lastStart, addDays(lastStart, 6));
  const deltaMs = thisWeekMs - lastWeekMs;
  const trend: Trend = {
    thisWeekMs,
    lastWeekMs,
    deltaMs,
    direction: deltaMs > 0 ? 'up' : deltaMs < 0 ? 'down' : 'flat',
  };

  return {
    isEmpty: history.length === 0,
    totalFocusMs,
    totalPomodoros,
    activeDays: history.length,
    dailyAverageMs: days === 0 ? 0 : totalFocusMs / days,
    weeklyAverageMs: history.length === 0 ? 0 : totalFocusMs / weeks,
    currentStreak: currentStreak(sessions, today),
    longestStreak: longestStreak(sessions),
    trend,
    tasks: { completed: tasks.filter((t) => t.completed).length, total: tasks.length },
    history,
  };
}
