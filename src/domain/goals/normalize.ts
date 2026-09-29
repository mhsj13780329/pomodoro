import type { Goal } from './types';

export const DEFAULT_DAILY_GOAL = 4;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 24;

export const defaultGoal = (): Goal => ({ dailyPomodoros: DEFAULT_DAILY_GOAL });

export function clampGoal(n: number): number {
  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(n)));
}

/** Any stored value becomes a valid goal; garbage falls back to the default. */
export function normalizeGoal(raw: unknown): Goal {
  if (typeof raw !== 'object' || raw === null) return defaultGoal();
  const n = (raw as Record<string, unknown>).dailyPomodoros;
  if (typeof n !== 'number' || !Number.isFinite(n)) return defaultGoal();
  return { dailyPomodoros: clampGoal(n) };
}
