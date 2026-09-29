import { describe, expect, it } from 'vitest';
import { createTimerEngine } from './engine';
import { FakeClock } from './testing';
import type { PersistedTimerState, TimerConfig, TimerEvent } from './types';

const MIN = 60_000;
const config: TimerConfig = {
  workMs: 25 * MIN,
  shortBreakMs: 5 * MIN,
  longBreakMs: 15 * MIN,
  sessionsBeforeLongBreak: 4,
  autoStartNext: false,
};

function build(restore: unknown, overrides: Partial<TimerConfig> = {}) {
  const events: TimerEvent[] = [];
  const engine = createTimerEngine({
    clock: new FakeClock(9_999_999_999_999), // restore must not depend on the clock
    config: { ...config, ...overrides },
    restore,
    onEvent: (e) => events.push(e),
  });
  return { engine, events };
}

const base: PersistedTimerState = {
  status: 'idle',
  sessionType: 'work',
  plannedMs: 25 * MIN,
  endsAt: null,
  remainingMs: null,
  savedAt: 1_000,
};

describe('timer restore', () => {
  it('restores idle on the stored session type', () => {
    const { engine, events } = build({ ...base, sessionType: 'shortBreak', plannedMs: 5 * MIN });
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'shortBreak', remainingMs: 5 * MIN });
    expect(events).toEqual([]);
  });

  it('restores paused with the same remaining time', () => {
    const { engine } = build({ ...base, status: 'paused', remainingMs: 12 * MIN });
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 12 * MIN });
  });

  it('restores running as paused with remaining = endsAt - savedAt', () => {
    const { engine, events } = build({
      ...base,
      status: 'running',
      endsAt: 1_000 + 10 * MIN,
      savedAt: 1_000,
    });
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 10 * MIN });
    expect(engine.getState().endsAt).toBeNull();
    expect(events).toEqual([]);
  });

  it('clamps remaining to 0..planned', () => {
    const tooMuch = build({ ...base, status: 'running', endsAt: 1_000 + 99 * MIN });
    expect(tooMuch.engine.getSnapshot().remainingMs).toBe(25 * MIN);
    const pausedTooMuch = build({ ...base, status: 'paused', remainingMs: 99 * MIN });
    expect(pausedTooMuch.engine.getSnapshot().remainingMs).toBe(25 * MIN);
  });

  it('resumes only when asked, from the saved remaining time', () => {
    const clock = new FakeClock(5_000_000);
    const engine = createTimerEngine({
      clock,
      config,
      restore: { ...base, status: 'running', endsAt: 1_000 + 10 * MIN },
    });
    clock.advance(3 * 60 * MIN);
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 10 * MIN });
    engine.tick();
    expect(engine.getSnapshot().status).toBe('paused');
    engine.resume();
    expect(engine.getState().endsAt).toBe(clock.now() + 10 * MIN);
  });

  it('completes once when nothing remains, flagged restored, never auto-started', () => {
    const endsAt = 5_000;
    const { engine, events } = build(
      { ...base, status: 'running', endsAt, savedAt: endsAt + 2000 },
      { autoStartNext: true },
    );
    expect(events).toEqual([
      { type: 'completed', sessionType: 'work', plannedMs: 25 * MIN, completedAt: endsAt, restored: true },
      { type: 'transitioned', from: 'work', to: 'shortBreak', autoStarted: false },
    ]);
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'shortBreak', completedWorkInCycle: 1 });
    engine.tick();
    expect(events).toHaveLength(2);
  });

  it('a restored zero-remaining break completes into work without a work completion', () => {
    const { engine, events } = build({
      ...base,
      status: 'paused',
      sessionType: 'shortBreak',
      plannedMs: 5 * MIN,
      remainingMs: 0,
    });
    expect(events[0]).toMatchObject({ type: 'completed', sessionType: 'shortBreak', restored: true, completedAt: 1_000 });
    expect(engine.getSnapshot().sessionType).toBe('work');
  });

  it.each([
    undefined,
    null,
    'garbage',
    42,
    {},
    { ...base, status: 'flying' },
    { ...base, sessionType: 'nap' },
    { ...base, plannedMs: -1 },
    { ...base, status: 'running', endsAt: null },
    { ...base, status: 'paused', remainingMs: 'x' },
    { ...base, savedAt: Number.NaN },
  ])('falls back to a fresh idle timer for corrupt input %#', (input) => {
    const { engine, events } = build(input);
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'work', remainingMs: 25 * MIN });
    expect(events).toEqual([]);
  });

  it('idle restore takes the duration from the current config', () => {
    const { engine } = build(base, { workMs: 30 * MIN });
    expect(engine.getSnapshot().plannedMs).toBe(30 * MIN);
  });
});
