export const KEYS = {
  schemaVersion: 'pomodoro.schemaVersion',
  settings: 'pomodoro.settings',
  tasks: 'pomodoro.tasks',
  goal: 'pomodoro.goal',
} as const;

/** Completed work sessions, one key per Gregorian local month (`YYYY-MM`). */
export const sessionsKey = (yyyyMm: string) => `pomodoro.sessions.${yyyyMm}`;
