import { addDays, daysBetween } from '../calendar/gregorian';
import type { PomodoroSession } from '../sessions/types';
import { totalsByDate } from './group';

/**
 * Streak rule (PRD section 9, docs/ARCHITECTURE.md): a local date is active if it has at least
 * one completed work Pomodoro. The current streak counts consecutive active dates ending today,
 * or ending yesterday when today has none yet. The daily goal does not affect streaks.
 */
export function currentStreak(sessions: readonly PomodoroSession[], today: string): number {
  const active = new Set(totalsByDate(sessions).map((d) => d.date));
  let cursor = active.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (active.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function longestStreak(sessions: readonly PomodoroSession[]): number {
  const dates = totalsByDate(sessions).map((d) => d.date);
  let best = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && daysBetween(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
