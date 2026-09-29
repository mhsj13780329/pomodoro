import { describe, expect, it } from 'vitest';
import { localDateOf } from '../calendar/localDate';
import type { PomodoroSession } from '../sessions/types';
import type { Task } from '../tasks/types';
import {
  currentStreak,
  dailySummary,
  goalProgress,
  longestStreak,
  longTermSummary,
  weeklySummary,
} from './index';

const MIN = 60_000;
let n = 0;
function work(localDate: string, extra: Partial<PomodoroSession> = {}): PomodoroSession {
  n += 1;
  return {
    id: `s${n}`,
    taskId: null,
    type: 'work',
    plannedMs: 25 * MIN,
    completedAt: 0,
    localDate,
    ...extra,
  };
}
/** Session recorded the way M6 does it: date derived from the instant in a zone. */
function at(iso: string, timeZone: string): PomodoroSession {
  const t = Date.parse(iso);
  return work(localDateOf(t, timeZone), { completedAt: t });
}
function task(completedAt: number | null): Task {
  return { id: `t${completedAt}`, title: 'x', completed: completedAt !== null, createdAt: 0, updatedAt: 0, completedAt };
}

describe('dailySummary', () => {
  it('counts pomodoros, focus time and tasks for one local date', () => {
    const sessions = [work('2026-05-10'), work('2026-05-10', { plannedMs: 50 * MIN }), work('2026-05-11')];
    const tasks = [task(Date.parse('2026-05-10T09:00:00Z')), task(Date.parse('2026-05-11T09:00:00Z')), task(null)];
    expect(dailySummary(sessions, tasks, '2026-05-10', 'UTC')).toEqual({
      date: '2026-05-10',
      pomodoros: 2,
      focusMs: 75 * MIN,
      completedTasks: 1,
    });
  });

  it('returns zeros for an empty day and ignores non-work sessions', () => {
    const brk = work('2026-05-10', { type: 'shortBreak' } as Partial<PomodoroSession>);
    expect(dailySummary([brk], [], '2026-05-10', 'UTC')).toEqual({
      date: '2026-05-10',
      pomodoros: 0,
      focusMs: 0,
      completedTasks: 0,
    });
  });

  it('dates task completion in the given zone around midnight', () => {
    const t = task(Date.parse('2026-05-10T20:45:00Z')); // 00:15 on the 11th in Tehran (+03:30)
    expect(dailySummary([], [t], '2026-05-11', 'Asia/Tehran').completedTasks).toBe(1);
    expect(dailySummary([], [t], '2026-05-10', 'Asia/Tehran').completedTasks).toBe(0);
    expect(dailySummary([], [t], '2026-05-10', 'UTC').completedTasks).toBe(1);
  });
});

describe('local-date grouping at midnight', () => {
  it('splits 23:59 and 00:01 Tehran into different days', () => {
    const a = at('2026-05-10T20:29:00Z', 'Asia/Tehran'); // 23:59
    const b = at('2026-05-10T20:31:00Z', 'Asia/Tehran'); // 00:01 next day
    expect(a.localDate).toBe('2026-05-10');
    expect(b.localDate).toBe('2026-05-11');
    expect(currentStreak([a, b], '2026-05-11')).toBe(2);
  });

  it('the same instant belongs to different days in different zones', () => {
    const t = '2026-05-10T23:30:00Z';
    expect(at(t, 'UTC').localDate).toBe('2026-05-10');
    expect(at(t, 'Asia/Tehran').localDate).toBe('2026-05-11');
  });
});

describe('streaks', () => {
  it('is 0 with no sessions', () => {
    expect(currentStreak([], '2026-05-10')).toBe(0);
    expect(longestStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const s = [work('2026-05-08'), work('2026-05-09'), work('2026-05-10'), work('2026-05-10')];
    expect(currentStreak(s, '2026-05-10')).toBe(3);
  });

  it('is not broken until the day ends: today empty, yesterday active', () => {
    const s = [work('2026-05-08'), work('2026-05-09')];
    expect(currentStreak(s, '2026-05-10')).toBe(2);
  });

  it('breaks after a gap of a full missing day', () => {
    const s = [work('2026-05-07'), work('2026-05-08')];
    expect(currentStreak(s, '2026-05-10')).toBe(0);
  });

  it('longest can exceed current', () => {
    const s = [work('2026-05-01'), work('2026-05-02'), work('2026-05-03'), work('2026-05-09'), work('2026-05-10')];
    expect(longestStreak(s)).toBe(3);
    expect(currentStreak(s, '2026-05-10')).toBe(2);
  });

  it('crosses a year boundary', () => {
    const s = [work('2025-12-31'), work('2026-01-01')];
    expect(currentStreak(s, '2026-01-01')).toBe(2);
    expect(longestStreak(s)).toBe(2);
  });

  it('ignores break sessions', () => {
    const brk = work('2026-05-10', { type: 'longBreak' } as Partial<PomodoroSession>);
    expect(currentStreak([brk], '2026-05-10')).toBe(0);
  });

  it('stays continuous across DST changes (New York)', () => {
    const tz = 'America/New_York';
    const spring = [
      at('2026-03-07T15:00:00Z', tz),
      at('2026-03-08T15:00:00Z', tz), // 23-hour day
      at('2026-03-09T15:00:00Z', tz),
    ];
    expect(longestStreak(spring)).toBe(3);
    const fall = [
      at('2026-10-31T15:00:00Z', tz),
      at('2026-11-01T15:00:00Z', tz), // 25-hour day
      at('2026-11-02T15:00:00Z', tz),
    ];
    expect(currentStreak(fall, '2026-11-02')).toBe(3);
  });

  it('late evening and early morning around DST still land on the right days', () => {
    const tz = 'America/New_York';
    const late = at('2026-03-09T03:30:00Z', tz); // 23:30 on Mar 8 local (EDT)
    const early = at('2026-03-08T05:30:00Z', tz); // 00:30 on Mar 8 local (EST)
    expect(late.localDate).toBe('2026-03-08');
    expect(early.localDate).toBe('2026-03-08');
  });
});

describe('goalProgress', () => {
  it('handles partial, reached, exceeded and no goal', () => {
    expect(goalProgress(3, 6)).toEqual({ completed: 3, goal: 6, ratio: 0.5, reached: false });
    expect(goalProgress(6, 6)).toMatchObject({ ratio: 1, reached: true });
    expect(goalProgress(8, 6)).toMatchObject({ completed: 8, ratio: 1, reached: true });
    expect(goalProgress(3, 0)).toMatchObject({ ratio: 0, reached: false });
  });
});

describe('weeklySummary', () => {
  const sessions = [
    work('2026-05-09'), // Saturday
    work('2026-05-11'),
    work('2026-05-11'),
    work('2026-05-13'),
    work('2026-05-13'),
    work('2026-05-13'),
    work('2026-05-13'),
    work('2026-05-18'), // next week
  ];

  it('zero-fills seven days starting Saturday', () => {
    const w = weeklySummary(sessions, '2026-05-13', 'saturday');
    expect(w.days.map((d) => d.date)).toEqual([
      '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15',
    ]);
    expect(w.days.map((d) => d.pomodoros)).toEqual([1, 0, 2, 0, 4, 0, 0]);
    expect(w.totalPomodoros).toBe(7);
    expect(w.totalFocusMs).toBe(7 * 25 * MIN);
  });

  it('starts on Monday for the Gregorian setting', () => {
    const w = weeklySummary(sessions, '2026-05-13', 'monday');
    expect(w.days[0].date).toBe('2026-05-11');
    expect(w.days[6].date).toBe('2026-05-17');
    expect(w.totalPomodoros).toBe(6);
  });

  it('buckets activity levels relative to the busiest day', () => {
    const w = weeklySummary(sessions, '2026-05-13', 'saturday');
    expect(w.days.map((d) => d.level)).toEqual([1, 0, 2, 0, 4, 0, 0]);
  });

  it('spans a year boundary', () => {
    const w = weeklySummary([work('2026-01-01')], '2025-12-31', 'monday');
    expect(w.days[0].date).toBe('2025-12-29');
    expect(w.days[6].date).toBe('2026-01-04');
    expect(w.totalPomodoros).toBe(1);
  });

  it('is all zeros when empty', () => {
    const w = weeklySummary([], '2026-05-13', 'monday');
    expect(w.days.every((d) => d.level === 0 && d.pomodoros === 0)).toBe(true);
  });
});

describe('longTermSummary', () => {
  it('is empty and zeroed with no data', () => {
    const s = longTermSummary([], [], '2026-05-13', 'monday');
    expect(s).toMatchObject({
      isEmpty: true,
      totalFocusMs: 0,
      dailyAverageMs: 0,
      weeklyAverageMs: 0,
      currentStreak: 0,
      longestStreak: 0,
      tasks: { completed: 0, total: 0 },
      history: [],
    });
    expect(s.trend.direction).toBe('flat');
  });

  it('computes totals, averages, streaks and history', () => {
    // first date 2026-05-01, today 2026-05-14 => 14 calendar days => 2 weeks
    const sessions = [work('2026-05-01'), work('2026-05-01'), work('2026-05-13'), work('2026-05-14')];
    const tasks = [task(1), task(null), task(2)];
    const s = longTermSummary(sessions, tasks, '2026-05-14', 'monday');
    expect(s.isEmpty).toBe(false);
    expect(s.totalPomodoros).toBe(4);
    expect(s.totalFocusMs).toBe(100 * MIN);
    expect(s.activeDays).toBe(3);
    expect(s.dailyAverageMs).toBeCloseTo((100 * MIN) / 14);
    expect(s.weeklyAverageMs).toBe(50 * MIN);
    expect(s.currentStreak).toBe(2);
    expect(s.longestStreak).toBe(2);
    expect(s.tasks).toEqual({ completed: 2, total: 3 });
    expect(s.history.map((d) => d.date)).toEqual(['2026-05-01', '2026-05-13', '2026-05-14']);
  });

  it('reports trend up, down and flat week over week', () => {
    // today Thu 2026-05-14, Monday weeks: this = 05-11..17, last = 05-04..10
    const up = longTermSummary([work('2026-05-05'), work('2026-05-12'), work('2026-05-13')], [], '2026-05-14', 'monday');
    expect(up.trend).toMatchObject({ thisWeekMs: 50 * MIN, lastWeekMs: 25 * MIN, deltaMs: 25 * MIN, direction: 'up' });
    const down = longTermSummary([work('2026-05-05'), work('2026-05-06')], [], '2026-05-14', 'monday');
    expect(down.trend.direction).toBe('down');
    const flat = longTermSummary([work('2026-05-05'), work('2026-05-12')], [], '2026-05-14', 'monday');
    expect(flat.trend.direction).toBe('flat');
  });

  it('is independent of calendar: only weekStart affects week-scoped values, not totals or streaks', () => {
    const sessions = [work('2026-05-09'), work('2026-05-10'), work('2026-05-11')];
    const a = longTermSummary(sessions, [], '2026-05-11', 'saturday');
    const b = longTermSummary(sessions, [], '2026-05-11', 'monday');
    expect({ ...a, trend: null }).toEqual({ ...b, trend: null });
  });
});
