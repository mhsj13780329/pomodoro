import type { SessionRepository } from '@/domain/repositories';
import type { PomodoroSession } from '@/domain/sessions/types';
import type { KeyValueStore } from '../storage';
import { sessionsKey } from './keys';

function isSession(v: unknown): v is PomodoroSession {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.taskId === null || typeof o.taskId === 'string') &&
    (o.type === 'work' || o.type === 'shortBreak' || o.type === 'longBreak') &&
    typeof o.plannedMs === 'number' &&
    typeof o.completedAt === 'number' &&
    typeof o.localDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.localDate)
  );
}

function readMonth(store: KeyValueStore, yyyyMm: string): PomodoroSession[] {
  const raw = store.get(sessionsKey(yyyyMm));
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSession) : [];
  } catch {
    return [];
  }
}

export function createSessionRepository(store: KeyValueStore): SessionRepository {
  return {
    async add(session) {
      // Read-modify-write of the current stored month in one synchronous block, so a
      // session completed in another tab is never overwritten by a stale copy.
      const month = session.localDate.slice(0, 7);
      const current = readMonth(store, month);
      if (current.some((s) => s.id === session.id)) return;
      store.set(sessionsKey(month), JSON.stringify([...current, session]));
    },
    async listByLocalDate(localDate) {
      return readMonth(store, localDate.slice(0, 7)).filter((s) => s.localDate === localDate);
    },
  };
}
