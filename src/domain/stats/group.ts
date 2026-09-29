import type { PomodoroSession } from '../sessions/types';
import type { DayTotals } from './types';

/** Groups completed work sessions by their stored local date (never UTC). Ascending by date. */
export function totalsByDate(sessions: readonly PomodoroSession[]): DayTotals[] {
  const map = new Map<string, DayTotals>();
  for (const s of sessions) {
    if (s.type !== 'work') continue;
    const day = map.get(s.localDate) ?? { date: s.localDate, pomodoros: 0, focusMs: 0 };
    day.pomodoros += 1;
    day.focusMs += s.plannedMs;
    map.set(s.localDate, day);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
