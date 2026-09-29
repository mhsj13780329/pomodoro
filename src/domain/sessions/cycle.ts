import type { PomodoroSession } from './types';

// The cycle counter is derived from today's completed work sessions (PRD section 5).
export function cycleProgress(todaysWorkSessionCount: number, sessionsBeforeLongBreak: number): number {
  const n = Math.max(1, Math.floor(sessionsBeforeLongBreak));
  const count = Math.max(0, Math.floor(todaysWorkSessionCount));
  return count % n;
}

export function countWorkSessionsOn(sessions: readonly PomodoroSession[], localDate: string): number {
  return sessions.filter((s) => s.type === 'work' && s.localDate === localDate).length;
}
