import type { Task } from './types';

export const MAX_TITLE_LENGTH = 200;

/** Trimmed title, or null when empty. Overlong titles are cut to the limit. */
export function normalizeTitle(raw: string): string | null {
  const title = raw.trim();
  if (title === '') return null;
  return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH).trimEnd() : title;
}

export function createTask(raw: string, ctx: { id: string; now: number }): Task | null {
  const title = normalizeTitle(raw);
  if (title === null) return null;
  return { id: ctx.id, title, completed: false, createdAt: ctx.now, updatedAt: ctx.now, completedAt: null };
}

/** Works for tasks in either status. */
export function editTitle(task: Task, raw: string, now: number): Task | null {
  const title = normalizeTitle(raw);
  if (title === null) return null;
  return { ...task, title, updatedAt: now };
}

export function completeTask(task: Task, now: number): Task {
  return { ...task, completed: true, completedAt: now, updatedAt: now };
}

export function reopenTask(task: Task, now: number): Task {
  return { ...task, completed: false, completedAt: null, updatedAt: now };
}

/** Incomplete tasks oldest first; completed tasks most recently completed first. */
export function splitTasks(tasks: readonly Task[]): { incomplete: Task[]; completed: Task[] } {
  const incomplete = tasks.filter((t) => !t.completed).sort((a, b) => a.createdAt - b.createdAt);
  const completed = tasks.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  return { incomplete, completed };
}

/**
 * The selection that actually counts: only an existing, incomplete task can be selected.
 * A task deleted (in any tab) or completed therefore reads as no selection.
 */
export function effectiveSelection(selectedId: string | null, tasks: readonly Task[]): string | null {
  if (selectedId === null) return null;
  const task = tasks.find((t) => t.id === selectedId);
  return task && !task.completed ? task.id : null;
}
