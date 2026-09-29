import { describe, expect, it } from 'vitest';
import type { PomodoroSession } from '../sessions/types';
import { activityGrid } from './activity';

let n = 0;
const work = (localDate: string): PomodoroSession => ({
  id: `a${(n += 1)}`,
  taskId: null,
  type: 'work',
  plannedMs: 1_500_000,
  completedAt: 0,
  localDate,
});

// 2026-03-18 is a Wednesday.
describe('activityGrid', () => {
  it('builds oldest-first weeks of seven days aligned to the week start', () => {
    const mon = activityGrid([], '2026-03-18', 3, 'monday');
    expect(mon).toHaveLength(3);
    expect(mon.every((w) => w.length === 7)).toBe(true);
    expect(mon[0][0].date).toBe('2026-03-02');
    expect(mon[2][0].date).toBe('2026-03-16');
    const sat = activityGrid([], '2026-03-18', 2, 'saturday');
    expect(sat[1][0].date).toBe('2026-03-14');
  });

  it('marks days after today as future with level 0', () => {
    const grid = activityGrid([work('2026-03-18')], '2026-03-18', 1, 'monday');
    expect(grid[0].map((c) => c.isFuture)).toEqual([false, false, false, true, true, true, true]);
    expect(grid[0][2].pomodoros).toBe(1);
  });

  it('scales levels to the busiest day and ignores breaks', () => {
    const sessions = [
      ...Array.from({ length: 4 }, () => work('2026-03-16')),
      work('2026-03-17'),
      { ...work('2026-03-18'), type: 'shortBreak' as const },
    ];
    const [week] = activityGrid(sessions, '2026-03-18', 1, 'monday');
    expect(week[0].level).toBe(4);
    expect(week[1].level).toBe(1);
    expect(week[2].level).toBe(0);
  });

  it('is all zeros when empty and clamps weeks to at least one', () => {
    const grid = activityGrid([], '2026-03-18', 0, 'monday');
    expect(grid).toHaveLength(1);
    expect(grid[0].every((c) => c.level === 0 && c.pomodoros === 0)).toBe(true);
  });
});
