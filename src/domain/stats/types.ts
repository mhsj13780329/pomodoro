export interface DayTotals {
  date: string; // YYYY-MM-DD local date
  pomodoros: number;
  focusMs: number;
}

export interface DailySummary extends DayTotals {
  completedTasks: number;
}

export interface GoalProgress {
  completed: number;
  goal: number;
  ratio: number; // 0..1
  reached: boolean;
}

export interface WeekDay extends DayTotals {
  /** Activity bucket 0-4, relative to the busiest day of the week. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface WeeklySummary {
  days: WeekDay[];
  totalPomodoros: number;
  totalFocusMs: number;
}

export interface ActivityCell extends DayTotals {
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface Trend {
  thisWeekMs: number;
  lastWeekMs: number;
  deltaMs: number;
  direction: TrendDirection;
}

export interface LongTermSummary {
  isEmpty: boolean;
  totalFocusMs: number;
  totalPomodoros: number;
  activeDays: number;
  dailyAverageMs: number;
  weeklyAverageMs: number;
  currentStreak: number;
  longestStreak: number;
  trend: Trend;
  tasks: { completed: number; total: number };
  history: DayTotals[];
}
