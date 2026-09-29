export type SessionType = 'work' | 'shortBreak' | 'longBreak';

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerConfig {
  workMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  sessionsBeforeLongBreak: number;
  autoStartNext: boolean;
}

export interface Clock {
  now(): number; // epoch milliseconds
}

// Immutable; a new object is produced only when version or remainingMs changes.
export interface TimerSnapshot {
  status: TimerStatus;
  sessionType: SessionType;
  plannedMs: number;
  remainingMs: number;
  completedWorkInCycle: number; // 0..sessionsBeforeLongBreak-1; equals sessionsBeforeLongBreak during the long break
  version: number; // increments on every state change (not on ticks)
}

// Serializable subset. The cycle counter is deliberately not part of it (PRD section 5).
export interface TimerState {
  status: TimerStatus;
  sessionType: SessionType;
  plannedMs: number;
  endsAt: number | null; // set when running
  remainingMs: number | null; // set when paused
}

export interface PersistedTimerState extends TimerState {
  savedAt: number; // epoch ms of the write
}

export type TimerEvent =
  | { type: 'started'; sessionType: SessionType; at: number }
  | { type: 'paused'; at: number }
  | { type: 'resumed'; at: number }
  | { type: 'reset'; sessionType: SessionType; at: number }
  | { type: 'skipped'; sessionType: SessionType; at: number }
  | {
      type: 'completed';
      sessionType: SessionType;
      plannedMs: number;
      completedAt: number;
      restored: boolean;
    }
  | { type: 'transitioned'; from: SessionType; to: SessionType; autoStarted: boolean };

export interface TimerEngine {
  getSnapshot(): TimerSnapshot;
  subscribe(listener: () => void): () => void;
  onEvent(listener: (e: TimerEvent) => void): () => void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  skip(): void;
  tick(): void;
  updateConfig(config: TimerConfig): void;
  getState(): TimerState;
  setCompletedWorkInCycle(n: number): void;
}

export interface TimerEngineDeps {
  clock: Clock;
  config: TimerConfig;
  restore?: unknown; // PersistedTimerState; validated, invalid input means a fresh idle timer
  completedWorkInCycle?: number;
  onEvent?: (e: TimerEvent) => void; // registered before construction-time events fire
}
