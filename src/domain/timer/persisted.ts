// Minimal persisted shape (docs/ARCHITECTURE.md 4.1). M4 moves this next to the engine types.
export interface PersistedTimerState {
  status: 'idle' | 'running' | 'paused';
  sessionType: 'work' | 'shortBreak' | 'longBreak';
  plannedMs: number;
  endsAt: number | null;
  remainingMs: number | null;
  savedAt: number;
}
