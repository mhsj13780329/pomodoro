import { describe, expect, it } from 'vitest';
import { countWorkSessionsOn, cycleProgress } from './cycle';
import type { PomodoroSession } from './types';

let seq = 0;
const s = (localDate: string, type: PomodoroSession['type'] = 'work'): PomodoroSession => ({
  id: `s${seq++}`,
  taskId: null,
  type,
  plannedMs: 1,
  completedAt: 0,
  localDate,
});

describe('cycleProgress', () => {
  it('is count mod n', () => {
    expect([0, 1, 3, 4, 5, 8].map((c) => cycleProgress(c, 4))).toEqual([0, 1, 3, 0, 1, 0]);
  });

  it('follows a changed sessionsBeforeLongBreak', () => {
    expect(cycleProgress(5, 4)).toBe(1);
    expect(cycleProgress(5, 3)).toBe(2);
    expect(cycleProgress(5, 6)).toBe(5);
  });

  it('guards invalid input', () => {
    expect(cycleProgress(5, 0)).toBe(0);
    expect(cycleProgress(-3, 4)).toBe(0);
  });
});

describe('countWorkSessionsOn', () => {
  it('counts only work sessions of the given local date (day boundary)', () => {
    const sessions = [
      s('2026-03-20'),
      s('2026-03-20'),
      s('2026-03-20', 'shortBreak'),
      s('2026-03-21'),
    ];
    expect(countWorkSessionsOn(sessions, '2026-03-20')).toBe(2);
    expect(countWorkSessionsOn(sessions, '2026-03-21')).toBe(1);
    expect(cycleProgress(countWorkSessionsOn(sessions, '2026-03-22'), 4)).toBe(0);
  });
});
