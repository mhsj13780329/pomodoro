// Minimal type only (PRD section 20). Recording arrives in M6.
export type SessionType = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSession {
  id: string;
  taskId: string | null;
  type: SessionType;
  plannedMs: number;
  completedAt: number;
  localDate: string; // YYYY-MM-DD in the user's timezone
}
