import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../memory/MemoryStore';
import { KEYS } from './keys';
import { createTaskRepository } from './taskRepository';
import { createTask } from '@/domain/tasks';

const task = (id: string, now = 1) => createTask(`task ${id}`, { id, now })!;

describe('task repository', () => {
  it('round trips add, update, remove', async () => {
    const repo = createTaskRepository(new MemoryStore());
    await repo.add(task('a'));
    await repo.update('a', { title: 'x', completed: true, completedAt: 5 });
    expect(await repo.list()).toEqual([{ ...task('a'), title: 'x', completed: true, completedAt: 5 }]);
    await repo.remove('a');
    expect(await repo.list()).toEqual([]);
  });
  it('ignores duplicate ids and missing ids', async () => {
    const repo = createTaskRepository(new MemoryStore());
    await repo.add(task('a'));
    await repo.add(task('a'));
    await repo.update('zzz', { title: 'x' });
    await repo.remove('zzz');
    expect(await repo.list()).toHaveLength(1);
  });
  it('reads corrupt or malformed data as empty or drops bad items', async () => {
    const store = new MemoryStore();
    const repo = createTaskRepository(store);
    store.set(KEYS.tasks, '{nope');
    expect(await repo.list()).toEqual([]);
    store.set(KEYS.tasks, JSON.stringify([task('a'), { id: 1 }]));
    expect(await repo.list()).toEqual([task('a')]);
  });
  it('two repositories over one store never erase each other', async () => {
    const store = new MemoryStore();
    const a = createTaskRepository(store);
    const b = createTaskRepository(store);
    await a.list();
    await b.list();
    await a.add(task('a'));
    await b.add(task('b'));
    await b.update('a', { title: 'edited' });
    await a.remove('b');
    await a.add(task('c'));
    const list = await b.list();
    expect(list.map((t) => t.id)).toEqual(['a', 'c']);
    expect(list[0].title).toBe('edited');
  });
});
