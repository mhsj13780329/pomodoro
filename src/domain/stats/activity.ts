import { addDays, startOfWeek, type WeekStart } from '../calendar/gregorian';
import type { PomodoroSession } from '../sessions/types';
import { totalsByDate } from './group';
import type { ActivityCell } from './types';

/**
 * Heatmap data: `weeks` columns of seven days, oldest week first, ending with the week
 * that contains `today`. Levels are relative to the busiest day shown. Days after `today`
 * are marked `isFuture` and always level 0. Independent of the display calendar.
 */
export function activityGrid(
  sessions: readonly PomodoroSession[],
  today: string,
  weeks: number,
  weekStart: WeekStart,
): ActivityCell[][] {
  const count = Math.max(1, Math.floor(weeks));
  const firstDay = addDays(startOfWeek(today, weekStart), -7 * (count - 1));
  const byDate = new Map(totalsByDate(sessions).map((d) => [d.date, d]));

  const raw = Array.from({ length: count }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstDay, w * 7 + d);
      const isFuture = date > today;
      const day = isFuture ? undefined : byDate.get(date);
      return { date, isFuture, pomodoros: day?.pomodoros ?? 0, focusMs: day?.focusMs ?? 0 };
    }),
  );
  const max = Math.max(0, ...raw.flat().map((c) => c.pomodoros));
  return raw.map((week) =>
    week.map((c) => ({
      ...c,
      level: max === 0 || c.pomodoros === 0 ? 0 : (Math.ceil((4 * c.pomodoros) / max) as 1 | 2 | 3 | 4),
    })),
  );
}
