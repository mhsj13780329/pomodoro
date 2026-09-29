import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../memory/MemoryStore';
import { createTimerStateRepository } from './timerStateRepository';
import { SESSION_KEYS } from './keys';
import type { PersistedTimerState } from '@/domain/timer';

const state: PersistedTimerState = {
  status: 'paused',
  sessionType: 'work',
  plannedMs: 1500000,
  endsAt: null,
  remainingMs: 900000,
  savedAt: 5,
};

describe('timer state repository', () => {
  it('round trips', async () => {
    const repo = createTimerStateRepository(new MemoryStore());
    await repo.save(state);
    expect(await repo.load()).toEqual(state);
  });
  it('returns null when missing, corrupt, or invalid', async () => {
    const store = new MemoryStore();
    const repo = createTimerStateRepository(store);
    expect(await repo.load()).toBeNull();
    store.set(SESSION_KEYS.timer, '{nope');
    expect(await repo.load()).toBeNull();
    store.set(SESSION_KEYS.timer, JSON.stringify({ status: 'flying' }));
    expect(await repo.load()).toBeNull();
  });
  it('stores the selected task id and clears it', async () => {
    const repo = createTimerStateRepository(new MemoryStore());
    expect(await repo.loadSelectedTaskId()).toBeNull();
    await repo.saveSelectedTaskId('t1');
    expect(await repo.loadSelectedTaskId()).toBe('t1');
    await repo.saveSelectedTaskId(null);
    expect(await repo.loadSelectedTaskId()).toBeNull();
  });
  it('keeps two tabs separate', async () => {
    const a = createTimerStateRepository(new MemoryStore());
    const b = createTimerStateRepository(new MemoryStore());
    await a.save(state);
    expect(await b.load()).toBeNull();
  });
});
