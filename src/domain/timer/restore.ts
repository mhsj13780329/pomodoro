import { plannedMsFor } from './config';
import type { PersistedTimerState, TimerConfig, TimerState } from './types';

const TYPES = ['work', 'shortBreak', 'longBreak'];
const STATUSES = ['idle', 'running', 'paused'];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isPersistedTimerState(v: unknown): v is PersistedTimerState {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!STATUSES.includes(o.status as string) || !TYPES.includes(o.sessionType as string)) return false;
  if (!isNum(o.plannedMs) || o.plannedMs <= 0 || !isNum(o.savedAt)) return false;
  if (o.status === 'running') return isNum(o.endsAt);
  if (o.status === 'paused') return isNum(o.remainingMs);
  return true;
}

export interface RestoreResult {
  state: TimerState;
  // Set when the session had no time left: it completes once, at this timestamp.
  completedAt: number | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function fresh(config: TimerConfig): TimerState {
  return {
    status: 'idle',
    sessionType: 'work',
    plannedMs: config.workMs,
    endsAt: null,
    remainingMs: null,
  };
}

// Pure and independent of the current time (PRD section 5).
export function restoreTimerState(persisted: unknown, config: TimerConfig): RestoreResult {
  if (!isPersistedTimerState(persisted)) return { state: fresh(config), completedAt: null };

  if (persisted.status === 'idle') {
    return {
      state: {
        status: 'idle',
        sessionType: persisted.sessionType,
        plannedMs: plannedMsFor(persisted.sessionType, config),
        endsAt: null,
        remainingMs: null,
      },
      completedAt: null,
    };
  }

  const plannedMs = persisted.plannedMs;
  let remaining: number;
  let completedAt: number;
  if (persisted.status === 'running') {
    const endsAt = persisted.endsAt as number;
    remaining = clamp(endsAt - persisted.savedAt, 0, plannedMs);
    completedAt = endsAt;
  } else {
    remaining = clamp(persisted.remainingMs as number, 0, plannedMs);
    completedAt = persisted.savedAt;
  }

  return {
    state: {
      status: 'paused',
      sessionType: persisted.sessionType,
      plannedMs,
      endsAt: null,
      remainingMs: remaining,
    },
    completedAt: remaining === 0 ? completedAt : null,
  };
}
