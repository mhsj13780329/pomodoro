import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_GOAL, MAX_DAILY_GOAL, MIN_DAILY_GOAL, normalizeGoal } from './index';

describe('normalizeGoal', () => {
  it('keeps a valid goal', () => {
    expect(normalizeGoal({ dailyPomodoros: 6 })).toEqual({ dailyPomodoros: 6 });
  });
  it('clamps and rounds', () => {
    expect(normalizeGoal({ dailyPomodoros: 0 }).dailyPomodoros).toBe(MIN_DAILY_GOAL);
    expect(normalizeGoal({ dailyPomodoros: 999 }).dailyPomodoros).toBe(MAX_DAILY_GOAL);
    expect(normalizeGoal({ dailyPomodoros: 3.6 }).dailyPomodoros).toBe(4);
  });
  it('falls back to the default on garbage', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { dailyPomodoros: '3' }, { dailyPomodoros: NaN }]) {
      expect(normalizeGoal(bad).dailyPomodoros).toBe(DEFAULT_DAILY_GOAL);
    }
  });
});
