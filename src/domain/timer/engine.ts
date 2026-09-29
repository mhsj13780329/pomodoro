import { plannedMsFor } from './config';
import { restoreTimerState } from './restore';
import type {
  SessionType,
  TimerEngine,
  TimerEngineDeps,
  TimerEvent,
  TimerSnapshot,
  TimerState,
  TimerStatus,
} from './types';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// No timers here: a driver calls tick(), and every decision comes from timestamps.
export function createTimerEngine(deps: TimerEngineDeps): TimerEngine {
  const { clock } = deps;
  let config = deps.config;

  let status: TimerStatus = 'idle';
  let sessionType: SessionType = 'work';
  let plannedMs = config.workMs;
  let endsAt: number | null = null;
  let pausedRemainingMs: number | null = null;
  let cycle = normalizeCycle(deps.completedWorkInCycle ?? 0);
  let version = 0;
  let cached: TimerSnapshot | null = null;

  const stateListeners = new Set<() => void>();
  const eventListeners = new Set<(e: TimerEvent) => void>();

  function normalizeCycle(n: number): number {
    const size = Math.max(1, Math.floor(config.sessionsBeforeLongBreak));
    return Math.max(0, Math.floor(n)) % size;
  }

  function remaining(now: number): number {
    if (status === 'running') return clamp((endsAt as number) - now, 0, plannedMs);
    if (status === 'paused') return pausedRemainingMs as number;
    return plannedMs;
  }

  function snapshotAt(now: number): TimerSnapshot {
    const remainingMs = remaining(now);
    if (
      cached &&
      cached.version === version &&
      cached.remainingMs === remainingMs
    ) {
      return cached;
    }
    cached = {
      status,
      sessionType,
      plannedMs,
      remainingMs,
      completedWorkInCycle: cycle,
      version,
    };
    return cached;
  }

  function emit(events: TimerEvent[]) {
    for (const e of events) {
      deps.onEvent?.(e);
      for (const l of [...eventListeners]) l(e);
    }
  }

  function notify() {
    for (const l of [...stateListeners]) l();
  }

  function changed(events: TimerEvent[]) {
    version += 1;
    notify();
    emit(events);
  }

  function nextTypeAfterSkip(): SessionType {
    if (sessionType === 'work') return 'shortBreak';
    return 'work';
  }

  // Moves to the next session, idle or auto-started.
  function moveOn(next: SessionType, from: SessionType, now: number, autoStart: boolean): TimerEvent {
    if (from === 'longBreak') cycle = 0;
    sessionType = next;
    plannedMs = plannedMsFor(next, config);
    if (autoStart) {
      status = 'running';
      endsAt = now + plannedMs;
      pausedRemainingMs = null;
    } else {
      status = 'idle';
      endsAt = null;
      pausedRemainingMs = null;
    }
    return { type: 'transitioned', from, to: next, autoStarted: autoStart };
  }

  function complete(completedAt: number, now: number, restored: boolean): TimerEvent[] {
    const from = sessionType;
    const planned = plannedMs;
    let next: SessionType = 'work';
    if (from === 'work') {
      cycle += 1;
      if (cycle >= Math.max(1, config.sessionsBeforeLongBreak)) {
        next = 'longBreak'; // the counter resets when the long break ends or is skipped
      } else {
        next = 'shortBreak';
      }
    }
    const transition = moveOn(next, from, now, !restored && config.autoStartNext);
    return [
      { type: 'completed', sessionType: from, plannedMs: planned, completedAt, restored },
      transition,
    ];
  }

  // Restore (pure, no clock).
  const restoredState = restoreTimerState(deps.restore, config);
  status = restoredState.state.status;
  sessionType = restoredState.state.sessionType;
  plannedMs = restoredState.state.plannedMs;
  endsAt = restoredState.state.endsAt;
  pausedRemainingMs = restoredState.state.remainingMs;
  if (restoredState.completedAt !== null) {
    const events = complete(restoredState.completedAt, restoredState.completedAt, true);
    version += 1;
    emit(events);
  }

  return {
    getSnapshot() {
      return snapshotAt(clock.now());
    },
    subscribe(listener) {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },
    onEvent(listener) {
      eventListeners.add(listener);
      return () => {
        eventListeners.delete(listener);
      };
    },
    start() {
      if (status !== 'idle') return;
      const now = clock.now();
      status = 'running';
      endsAt = now + plannedMs;
      changed([{ type: 'started', sessionType, at: now }]);
    },
    pause() {
      if (status !== 'running') return;
      const now = clock.now();
      pausedRemainingMs = remaining(now);
      status = 'paused';
      endsAt = null;
      changed([{ type: 'paused', at: now }]);
    },
    resume() {
      if (status !== 'paused') return;
      const now = clock.now();
      endsAt = now + (pausedRemainingMs as number);
      pausedRemainingMs = null;
      status = 'running';
      changed([{ type: 'resumed', at: now }]);
    },
    reset() {
      if (status === 'idle') return;
      const now = clock.now();
      status = 'idle';
      endsAt = null;
      pausedRemainingMs = null;
      plannedMs = plannedMsFor(sessionType, config);
      changed([{ type: 'reset', sessionType, at: now }]);
    },
    skip() {
      const now = clock.now();
      const from = sessionType;
      const skipped: TimerEvent = { type: 'skipped', sessionType: from, at: now };
      const transition = moveOn(nextTypeAfterSkip(), from, now, config.autoStartNext);
      changed([skipped, transition]);
    },
    tick() {
      const now = clock.now();
      if (status !== 'running') return;
      if (now >= (endsAt as number)) {
        changed(complete(endsAt as number, now, false));
        return;
      }
      const before = cached;
      const after = snapshotAt(now);
      if (after !== before) notify();
    },
    updateConfig(next) {
      config = next;
      if (status === 'idle') {
        const planned = plannedMsFor(sessionType, config);
        const newCycle = sessionType === 'longBreak' ? cycle : normalizeCycle(cycle);
        if (planned !== plannedMs || newCycle !== cycle) {
          plannedMs = planned;
          cycle = newCycle;
          changed([]);
        }
      }
    },
    getState(): TimerState {
      return {
        status,
        sessionType,
        plannedMs,
        endsAt: status === 'running' ? endsAt : null,
        remainingMs: status === 'paused' ? pausedRemainingMs : null,
      };
    },
    setCompletedWorkInCycle(n) {
      if (status !== 'idle' || sessionType === 'longBreak') return;
      const value = normalizeCycle(n);
      if (value === cycle) return;
      cycle = value;
      changed([]);
    },
  };
}
