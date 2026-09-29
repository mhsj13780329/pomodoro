import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../memory/MemoryStore';
import { createGoalRepository } from './goalRepository';
import { KEYS } from './keys';

describe('goal repository', () => {
  it('loads null when empty', async () => {
    expect(await createGoalRepository(new MemoryStore()).load()).toBeNull();
  });
  it('round trips', async () => {
    const repo = createGoalRepository(new MemoryStore());
    await repo.save({ dailyPomodoros: 7 });
    expect(await repo.load()).toEqual({ dailyPomodoros: 7 });
  });
  it('treats corrupt JSON as unset and normalizes bad values', async () => {
    const store = new MemoryStore();
    const repo = createGoalRepository(store);
    store.set(KEYS.goal, '{oops');
    expect(await repo.load()).toBeNull();
    store.set(KEYS.goal, JSON.stringify({ dailyPomodoros: 500 }));
    expect(await repo.load()).toEqual({ dailyPomodoros: 24 });
  });
});
