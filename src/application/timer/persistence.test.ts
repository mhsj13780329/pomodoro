import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@/data/memory/MemoryStore';
import { createTimerStateRepository } from '@/data/session/timerStateRepository';
import { SESSION_KEYS } from '@/data/session/keys';
import { createTimerEngine } from '@/domain/timer';
import type { TimerConfig, TimerEvent } from '@/domain/timer';
import { FakeClock } from '@/domain/timer/testing';
import { attachTimerPersistence } from './persistence';

const MIN = 60_000;
const config: TimerConfig = {
  workMs: 25 * MIN,
  shortBreakMs: 5 * MIN,
  longBreakMs: 15 * MIN,
  sessionsBeforeLongBreak: 4,
  autoStartNext: true,
};

// Mirrors the provider's boot: load, create engine, attach persistence.
async function boot(store: MemoryStore, clock: FakeClock, events: TimerEvent[] = []) {
  const repo = createTimerStateRepository(store);
  const engine = createTimerEngine({
    clock,
    config,
    restore: await repo.load(),
    onEvent: (e) => events.push(e),
  });
  const persistence = attachTimerPersistence({ engine, repo, clock });
  return { engine, persistence };
}

const writes = (store: MemoryStore) => {
  let count = 0;
  const set = store.set.bind(store);
  store.set = (k, v) => {
    count += 1;
    return set(k, v);
  };
  return () => count;
};

describe('timer persistence', () => {
  it('saves on state changes but not on plain ticks', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const { engine } = await boot(store, clock);
    const count = writes(store);
    engine.start();
    expect(count()).toBe(1);
    for (let i = 0; i < 10; i++) {
      clock.advance(1000);
      engine.tick();
    }
    expect(count()).toBe(1);
    engine.pause();
    expect(count()).toBe(2);
  });

  it('saveNow captures elapsed time of a running timer; reload restores paused', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const a = await boot(store, clock);
    a.engine.start();
    clock.advance(10 * MIN);
    a.persistence.saveNow(); // pagehide
    clock.advance(3 * 60 * MIN); // time spent closed
    const b = await boot(store, clock);
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 15 * MIN });
    clock.advance(MIN);
    b.engine.tick();
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 15 * MIN });
  });

  it('a crash without pagehide restores as of the last state change', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const a = await boot(store, clock);
    a.engine.start();
    clock.advance(10 * MIN);
    const b = await boot(store, clock);
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 25 * MIN });
  });

  it('restores idle on the same session type', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const a = await boot(store, clock);
    a.engine.skip(); // auto-start is on, so pause to get idle via reset
    a.engine.pause();
    a.engine.reset();
    const b = await boot(store, clock);
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'shortBreak' });
  });

  it('zero remaining completes once on restore, is not auto-started, and is not replayed', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const a = await boot(store, clock);
    a.engine.start();
    clock.advance(25 * MIN);
    a.persistence.saveNow(); // saved at exactly the planned end
    const events: TimerEvent[] = [];
    const b = await boot(store, clock, events);
    expect(events.filter((e) => e.type === 'completed')).toHaveLength(1);
    expect(events.find((e) => e.type === 'completed')).toMatchObject({ restored: true });
    expect(b.engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'shortBreak' });

    const again: TimerEvent[] = [];
    await boot(store, clock, again);
    expect(again.filter((e) => e.type === 'completed')).toHaveLength(0);
  });

  it('corrupt stored state means a fresh idle timer', async () => {
    const store = new MemoryStore();
    store.set(SESSION_KEYS.timer, '{{{');
    const { engine } = await boot(store, new FakeClock());
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'work', remainingMs: 25 * MIN });
  });

  it('two tabs with their own stores never affect each other', async () => {
    const clock = new FakeClock();
    const storeA = new MemoryStore();
    const storeB = new MemoryStore();
    const a = await boot(storeA, clock);
    a.engine.start();
    clock.advance(MIN);
    const b = await boot(storeB, clock);
    expect(b.engine.getSnapshot().status).toBe('idle');
    b.engine.start();
    b.engine.pause();
    b.engine.reset();
    a.engine.pause();
    expect(a.engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 24 * MIN });
    expect(b.engine.getSnapshot().status).toBe('idle');
    const a2 = await boot(storeA, clock);
    expect(a2.engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 24 * MIN });
  });
});
