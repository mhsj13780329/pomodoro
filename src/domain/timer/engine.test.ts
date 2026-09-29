import { describe, expect, it } from 'vitest';
import { createTimerEngine } from './engine';
import { FakeClock } from './testing';
import type { TimerConfig, TimerEvent } from './types';

const MIN = 60_000;
const HOUR = 60 * MIN;

const config: TimerConfig = {
  workMs: 25 * MIN,
  shortBreakMs: 5 * MIN,
  longBreakMs: 15 * MIN,
  sessionsBeforeLongBreak: 4,
  autoStartNext: false,
};

function setup(overrides: Partial<TimerConfig> = {}, completedWorkInCycle = 0) {
  const clock = new FakeClock();
  const events: TimerEvent[] = [];
  const engine = createTimerEngine({
    clock,
    config: { ...config, ...overrides },
    completedWorkInCycle,
    onEvent: (e) => events.push(e),
  });
  return { clock, engine, events };
}

function finishSession(s: ReturnType<typeof setup>) {
  s.engine.start();
  s.clock.advance(s.engine.getSnapshot().plannedMs);
  s.engine.tick();
}

describe('timer engine', () => {
  it('starts idle on a 25 minute work session', () => {
    const { engine } = setup();
    const snap = engine.getSnapshot();
    expect(snap).toMatchObject({ status: 'idle', sessionType: 'work', plannedMs: 25 * MIN, remainingMs: 25 * MIN });
  });

  it('start, pause, resume compute remaining from timestamps', () => {
    const { engine, clock, events } = setup();
    engine.start();
    clock.advance(10 * MIN);
    expect(engine.getSnapshot().remainingMs).toBe(15 * MIN);
    engine.pause();
    clock.advance(3 * HOUR);
    expect(engine.getSnapshot()).toMatchObject({ status: 'paused', remainingMs: 15 * MIN });
    engine.resume();
    clock.advance(5 * MIN);
    expect(engine.getSnapshot().remainingMs).toBe(10 * MIN);
    expect(events.map((e) => e.type)).toEqual(['started', 'paused', 'resumed']);
  });

  it('ignores invalid calls', () => {
    const { engine, events } = setup();
    engine.pause();
    engine.resume();
    engine.reset();
    engine.tick();
    expect(events).toEqual([]);
    engine.start();
    engine.start();
    expect(events).toHaveLength(1);
  });

  it('reset returns to idle on the same session type without counting', () => {
    const { engine, clock, events } = setup();
    engine.start();
    clock.advance(5 * MIN);
    engine.reset();
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'work', remainingMs: 25 * MIN });
    expect(events.map((e) => e.type)).toEqual(['started', 'reset']);
  });

  it('completes a work session into a short break, idle', () => {
    const s = setup();
    finishSession(s);
    expect(s.engine.getSnapshot()).toMatchObject({
      status: 'idle',
      sessionType: 'shortBreak',
      plannedMs: 5 * MIN,
      completedWorkInCycle: 1,
    });
    expect(s.events.slice(1)).toEqual([
      { type: 'completed', sessionType: 'work', plannedMs: 25 * MIN, completedAt: s.clock.now(), restored: false },
      { type: 'transitioned', from: 'work', to: 'shortBreak', autoStarted: false },
    ]);
  });

  it('auto-starts the next session when enabled', () => {
    const s = setup({ autoStartNext: true });
    finishSession(s);
    expect(s.engine.getSnapshot()).toMatchObject({ status: 'running', sessionType: 'shortBreak' });
    expect(s.events.at(-1)).toEqual({
      type: 'transitioned',
      from: 'work',
      to: 'shortBreak',
      autoStarted: true,
    });
  });

  it('takes a long break after the fourth work session, then works again', () => {
    const s = setup();
    const types: string[] = [];
    for (let i = 0; i < 4; i++) {
      types.push(s.engine.getSnapshot().sessionType);
      finishSession(s); // work
      types.push(s.engine.getSnapshot().sessionType);
      if (i < 3) finishSession(s); // short break
    }
    expect(types).toEqual([
      'work', 'shortBreak', 'work', 'shortBreak', 'work', 'shortBreak', 'work', 'longBreak',
    ]);
    expect(s.engine.getSnapshot()).toMatchObject({ plannedMs: 15 * MIN, completedWorkInCycle: 4 });
    s.engine.setCompletedWorkInCycle(0); // ignored during the long break
    expect(s.engine.getSnapshot().completedWorkInCycle).toBe(4);
    finishSession(s);
    expect(s.engine.getSnapshot()).toMatchObject({ sessionType: 'work', completedWorkInCycle: 0 });
  });

  it('resets the counter when a long break is skipped', () => {
    const s = setup({}, 3);
    finishSession(s);
    s.engine.skip();
    expect(s.engine.getSnapshot()).toMatchObject({ sessionType: 'work', completedWorkInCycle: 0 });
  });

  it('honors a custom sessionsBeforeLongBreak', () => {
    const s = setup({ sessionsBeforeLongBreak: 2 });
    finishSession(s);
    finishSession(s);
    finishSession(s);
    expect(s.engine.getSnapshot().sessionType).toBe('longBreak');
  });

  it('uses an injected cycle counter', () => {
    const s = setup({}, 3);
    finishSession(s);
    expect(s.engine.getSnapshot().sessionType).toBe('longBreak');
  });

  it('skipping work does not count and emits no completed event', () => {
    const { engine, events } = setup();
    engine.start();
    engine.skip();
    expect(engine.getSnapshot()).toMatchObject({ status: 'idle', sessionType: 'shortBreak', completedWorkInCycle: 0 });
    expect(events.map((e) => e.type)).toEqual(['started', 'skipped', 'transitioned']);
  });

  it('skipping a break returns to work with no completed event and no counter change', () => {
    const s = setup();
    finishSession(s);
    s.events.length = 0;
    s.engine.skip();
    expect(s.engine.getSnapshot()).toMatchObject({ sessionType: 'work', completedWorkInCycle: 1 });
    expect(s.events.map((e) => e.type)).toEqual(['skipped', 'transitioned']);
  });

  it('skipping from idle advances the session', () => {
    const { engine } = setup();
    engine.skip();
    expect(engine.getSnapshot().sessionType).toBe('shortBreak');
  });

  it('completes exactly one session after a multi-hour background gap', () => {
    const s = setup({ autoStartNext: true });
    s.engine.start();
    s.clock.advance(6 * HOUR);
    s.engine.tick();
    s.engine.tick();
    const completed = s.events.filter((e) => e.type === 'completed');
    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({ completedAt: s.clock.now() - 6 * HOUR + 25 * MIN });
    // next session starts at the tick time, not back-dated
    expect(s.engine.getSnapshot()).toMatchObject({ status: 'running', remainingMs: 5 * MIN });
  });

  it('is correct after simulated sleep while paused and running', () => {
    const s = setup();
    s.engine.start();
    s.clock.advance(10 * MIN);
    s.clock.advance(8 * HOUR); // laptop asleep
    expect(s.engine.getSnapshot().remainingMs).toBe(0);
    s.engine.tick();
    expect(s.events.filter((e) => e.type === 'completed')).toHaveLength(1);
  });

  it('getSnapshot has no side effects even when due', () => {
    const s = setup();
    s.engine.start();
    s.clock.advance(HOUR);
    s.engine.getSnapshot();
    expect(s.events.map((e) => e.type)).toEqual(['started']);
  });

  it('clamps remaining when the clock goes backwards', () => {
    const s = setup();
    s.engine.start();
    s.clock.advance(-2 * HOUR);
    expect(s.engine.getSnapshot().remainingMs).toBe(25 * MIN);
    s.engine.tick();
    expect(s.engine.getSnapshot().status).toBe('running');
  });

  it('config changes never alter a running session', () => {
    const s = setup();
    s.engine.start();
    const before = s.engine.getState();
    s.engine.updateConfig({ ...config, workMs: 50 * MIN });
    expect(s.engine.getState()).toEqual(before);
    s.clock.advance(25 * MIN);
    s.engine.tick();
    s.engine.skip(); // break -> work
    expect(s.engine.getSnapshot().plannedMs).toBe(50 * MIN);
  });

  it('config changes refresh the upcoming idle session', () => {
    const { engine } = setup();
    engine.updateConfig({ ...config, workMs: 30 * MIN });
    expect(engine.getSnapshot().plannedMs).toBe(30 * MIN);
  });

  it('setCompletedWorkInCycle applies only while idle', () => {
    const { engine } = setup();
    engine.setCompletedWorkInCycle(2);
    expect(engine.getSnapshot().completedWorkInCycle).toBe(2);
    engine.start();
    engine.setCompletedWorkInCycle(0);
    expect(engine.getSnapshot().completedWorkInCycle).toBe(2);
    engine.reset();
    engine.setCompletedWorkInCycle(6);
    expect(engine.getSnapshot().completedWorkInCycle).toBe(2);
  });

  it('keeps snapshot identity stable between ticks and version unchanged by ticks', () => {
    const { engine, clock } = setup();
    engine.start();
    const a = engine.getSnapshot();
    expect(engine.getSnapshot()).toBe(a);
    clock.advance(1000);
    engine.tick();
    const b = engine.getSnapshot();
    expect(b).not.toBe(a);
    expect(b.version).toBe(a.version);
    expect(engine.getSnapshot()).toBe(b);
  });

  it('notifies subscribers on state changes and on ticks that change the display', () => {
    const { engine, clock } = setup();
    let calls = 0;
    const off = engine.subscribe(() => calls++);
    engine.start();
    expect(calls).toBe(1);
    engine.getSnapshot();
    engine.tick(); // nothing changed
    expect(calls).toBe(1);
    clock.advance(1000);
    engine.tick();
    expect(calls).toBe(2);
    off();
    engine.pause();
    expect(calls).toBe(2);
  });

  it('getState is serializable and reflects status', () => {
    const { engine, clock } = setup();
    engine.start();
    expect(engine.getState()).toEqual({
      status: 'running',
      sessionType: 'work',
      plannedMs: 25 * MIN,
      endsAt: clock.now() + 25 * MIN,
      remainingMs: null,
    });
    clock.advance(MIN);
    engine.pause();
    expect(engine.getState()).toMatchObject({ status: 'paused', endsAt: null, remainingMs: 24 * MIN });
  });
});
