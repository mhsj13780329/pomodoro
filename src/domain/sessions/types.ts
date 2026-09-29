// Minimal type only (PRD section 20). Recording arrives in M6.
import type { SessionType } from '../timer/types';

export type { SessionType };

export interface PomodoroSession {
  id: string;
  taskId: string | null;
  type: SessionType;
  plannedMs: number;
  completedAt: number;
  localDate: string; // YYYY-MM-DD in the user's timezone
}
