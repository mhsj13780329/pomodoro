import { describe, expect, it } from 'vitest';
import { createTimerEngine } from './engine';
import { FakeClock } from './testing';
import type { PersistedTimerState, TimerConfig } from './types';

const MIN = 60_000;
const config: TimerConfig = {
  workMs: 25 * MIN,
  shortBreakMs: 5 * MIN,
  longBreakMs: 15 * MIN,
  sessionsBeforeLongBreak: 4,
  autoStartNext: false,
};

// Each tab owns its engine and its own store; a store here is a plain variable.
describe('independent tabs', () => {
  it('actions in one engine never change the other or its store', () => {
    const clock = new FakeClock();
    const storeA: { value: PersistedTimerState | null } = { value: null };
    const storeB: { value: PersistedTimerState | null } = { value: null };
    const save = (store: typeof storeA, engine: ReturnType<typeof createTimerEngine>) => {
      store.value = { ...engine.getState(), savedAt: clock.now() };
    };

    const a = createTimerEngine({ clock, config, restore: storeA.value });
    a.start();
    save(storeA, a);
    clock.advance(5 * MIN);

    // second tab opens with empty session storage
    const b = createTimerEngine({ clock, config, restore: storeB.value });
    expect(b.getSnapshot().status).toBe('idle');

    b.start();
    save(storeB, b);
    clock.advance(MIN);
    a.pause();
    save(storeA, a);
    b.reset();
    save(storeB, b);

    expect(a.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 19 * MIN });
    expect(b.getSnapshot().status).toBe('idle');
    expect(storeA.value?.status).toBe('paused');
    expect(storeB.value?.status).toBe('idle');

    // reloading tab A restores its own state only
    const a2 = createTimerEngine({ clock, config, restore: storeA.value });
    expect(a2.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 19 * MIN });
  });
});
