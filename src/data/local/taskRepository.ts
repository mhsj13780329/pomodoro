import type { TaskRepository } from '@/domain/repositories';
import type { Task } from '@/domain/tasks/types';
import type { KeyValueStore } from '../storage';
import { KEYS } from './keys';

function isTask(v: unknown): v is Task {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.completed === 'boolean' &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number' &&
    (o.completedAt === null || typeof o.completedAt === 'number')
  );
}

function read(store: KeyValueStore): Task[] {
  const raw = store.get(KEYS.tasks);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTask) : [];
  } catch {
    return [];
  }
}

const write = (store: KeyValueStore, tasks: Task[]) => {
  store.set(KEYS.tasks, JSON.stringify(tasks));
};

// Every write re-reads the current stored array in the same synchronous block, so a task
// added in another tab is never overwritten by a stale copy.
export function createTaskRepository(store: KeyValueStore): TaskRepository {
  return {
    async list() {
      return read(store);
    },
    async add(task) {
      const current = read(store);
      if (current.some((t) => t.id === task.id)) return;
      write(store, [...current, task]);
    },
    async update(id, patch) {
      const current = read(store);
      if (!current.some((t) => t.id === id)) return;
      write(store, current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    async remove(id) {
      const current = read(store);
      if (!current.some((t) => t.id === id)) return;
      write(store, current.filter((t) => t.id !== id));
    },
  };
}
