import { localDateOf } from '../calendar/localDate';
import type { PomodoroSession } from '../sessions/types';
import type { Task } from '../tasks/types';
import { totalsByDate } from './group';
import type { DailySummary, GoalProgress } from './types';

/** Tasks only store a timestamp, so their completion date needs the user's time zone. */
export function completedTasksOn(tasks: readonly Task[], date: string, timeZone: string): number {
  return tasks.filter(
    (t) => t.completed && t.completedAt !== null && localDateOf(t.completedAt, timeZone) === date,
  ).length;
}

export function dailySummary(
  sessions: readonly PomodoroSession[],
  tasks: readonly Task[],
  date: string,
  timeZone: string,
): DailySummary {
  const day = totalsByDate(sessions).find((d) => d.date === date);
  return {
    date,
    pomodoros: day?.pomodoros ?? 0,
    focusMs: day?.focusMs ?? 0,
    completedTasks: completedTasksOn(tasks, date, timeZone),
  };
}

/** A goal of 0 or less means "no goal": ratio 0, never reached. */
export function goalProgress(completed: number, goal: number): GoalProgress {
  if (goal <= 0) return { completed, goal, ratio: 0, reached: false };
  return { completed, goal, ratio: Math.min(1, completed / goal), reached: completed >= goal };
}
