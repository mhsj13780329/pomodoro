import { localDateOf } from '../calendar/localDate';
import type { TimerEvent } from '../timer/types';
import type { PomodoroSession } from './types';

/** IDs are injected; the domain never generates randomness. */
export type IdGenerator = () => string;

/**
 * Only a completed work session becomes a record (skips, resets and breaks are never stored).
 * `completedAt` is the planned end, so the local date stays right after a long sleep.
 */
export function sessionFromCompletion(
  event: TimerEvent,
  ctx: { id: string; taskId: string | null; timeZone: string },
): PomodoroSession | null {
  if (event.type !== 'completed' || event.sessionType !== 'work') return null;
  return {
    id: ctx.id,
    taskId: ctx.taskId,
    type: 'work',
    plannedMs: event.plannedMs,
    completedAt: event.completedAt,
    localDate: localDateOf(event.completedAt, ctx.timeZone),
  };
}
