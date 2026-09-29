import { describe, expect, it } from 'vitest';
import { MAX_TITLE_LENGTH, completeTask, createTask, editTitle, effectiveSelection, normalizeTitle, reopenTask, splitTasks } from './rules';

const make = (title = 'Write', id = 'a', now = 10) => createTask(title, { id, now })!;

describe('task rules', () => {
  it('creates a trimmed incomplete task', () => {
    expect(make('  Write  ')).toEqual({
      id: 'a', title: 'Write', completed: false, createdAt: 10, updatedAt: 10, completedAt: null,
    });
  });
  it('rejects empty and whitespace titles', () => {
    expect(createTask('', { id: 'a', now: 1 })).toBeNull();
    expect(createTask('   ', { id: 'a', now: 1 })).toBeNull();
    expect(editTitle(make(), ' ', 5)).toBeNull();
  });
  it('caps title length', () => {
    expect(normalizeTitle('x'.repeat(500))).toHaveLength(MAX_TITLE_LENGTH);
  });
  it('edits the title of incomplete and completed tasks', () => {
    const t = make();
    expect(editTitle(t, ' New ', 20)).toMatchObject({ title: 'New', updatedAt: 20, completed: false });
    const done = completeTask(t, 30);
    expect(editTitle(done, 'Old', 40)).toMatchObject({ title: 'Old', completed: true, completedAt: 30, updatedAt: 40 });
  });
  it('complete sets the timestamp and reopen clears it', () => {
    const done = completeTask(make(), 50);
    expect(done).toMatchObject({ completed: true, completedAt: 50, updatedAt: 50 });
    expect(reopenTask(done, 60)).toMatchObject({ completed: false, completedAt: null, updatedAt: 60 });
  });
  it('splits and orders tasks', () => {
    const a = make('a', 'a', 1);
    const b = make('b', 'b', 2);
    const c = completeTask(make('c', 'c', 3), 100);
    const d = completeTask(make('d', 'd', 4), 200);
    const { incomplete, completed } = splitTasks([b, d, a, c]);
    expect(incomplete.map((t) => t.id)).toEqual(['a', 'b']);
    expect(completed.map((t) => t.id)).toEqual(['d', 'c']);
  });
  it('only an existing incomplete task is a valid selection', () => {
    const a = make('a', 'a');
    const done = completeTask(make('b', 'b'), 5);
    expect(effectiveSelection('a', [a, done])).toBe('a');
    expect(effectiveSelection('b', [a, done])).toBeNull();
    expect(effectiveSelection('gone', [a])).toBeNull();
    expect(effectiveSelection(null, [a])).toBeNull();
  });
  it('completing the selected task clears the selection', () => {
    const a = make('a', 'a');
    expect(effectiveSelection('a', [completeTask(a, 5)])).toBeNull();
  });
  it('deleting the selected task clears the selection', () => {
    expect(effectiveSelection('a', [])).toBeNull();
  });
});
