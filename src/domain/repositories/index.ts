import type { Goal } from '../goals/types';
import type { PomodoroSession } from '../sessions/types';
import type { SettingsPatch, UserSettings } from '../settings/types';
import type { Task } from '../tasks/types';
import type { PersistedTimerState } from '../timer/types';

// Ports only. Every method is async so a future IndexedDB or cloud repository is a drop-in.
// Writes are operation-level read-modify-write against current storage, never a cached copy.

export interface SettingsRepository {
  load(): Promise<UserSettings>;
  update(patch: SettingsPatch): Promise<UserSettings>;
}

// The ports below are implemented (and refined) by the milestone that uses them.
export interface TaskRepository {
  list(): Promise<Task[]>;
  add(task: Task): Promise<void>;
  update(id: string, patch: Partial<Omit<Task, 'id'>>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SessionRepository {
  add(session: PomodoroSession): Promise<void>;
  listByLocalDate(localDate: string): Promise<PomodoroSession[]>;
  /** Every stored session, for statistics. */
  listAll(): Promise<PomodoroSession[]>;
}

export interface TimerStateRepository {
  load(): Promise<PersistedTimerState | null>;
  save(state: PersistedTimerState): Promise<void>;
  loadSelectedTaskId(): Promise<string | null>;
  saveSelectedTaskId(id: string | null): Promise<void>;
}

export interface GoalRepository {
  load(): Promise<Goal | null>;
  save(goal: Goal): Promise<void>;
}
