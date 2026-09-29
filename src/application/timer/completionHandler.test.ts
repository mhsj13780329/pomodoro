import { describe, expect, it } from 'vitest';
import { createSessionRepository } from '@/data/local/sessionRepository';
import { MemoryStore } from '@/data/memory/MemoryStore';
import { defaultSettings } from '@/domain/settings';
import type { UserSettings } from '@/domain/settings';
import { createTimerEngine, timerConfigFromSettings } from '@/domain/timer';
import { FakeClock } from '@/domain/timer/testing';
import { countWorkSessionsOn } from '@/domain/sessions/cycle';
import { createCompletionHandler } from './completionHandler';

const TZ = 'UTC';
let idSeq = 0;
let selected: string | null = 'task1';
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function setup(overrides: Partial<UserSettings> = {}, store = new MemoryStore()) {
  let recorded = 0;
  const settings: UserSettings = { ...defaultSettings('en'), ...overrides };
  const sessions = createSessionRepository(store);
  const calls: string[] = [];
  const handler = createCompletionHandler({
    sessions,
    newId: () => `id${idSeq++}`,
    timeZone: () => TZ,
    getSelectedTaskId: async () => selected,
    getSettings: () => settings,
    onSessionRecorded: () => {
      recorded += 1;
    },
    effects: {
      playSound: () => calls.push('sound'),
      notify: () => calls.push('notify'),
      toast: () => calls.push('toast'),
    },
  });
  const clock = new FakeClock(Date.UTC(2026, 2, 20, 10, 0));
  const config = timerConfigFromSettings(settings.timer);
  const engine = createTimerEngine({ clock, config, onEvent: handler });
  const today = async () => {
    await flush();
    return sessions.listByLocalDate('2026-03-20');
  };
  return { engine, clock, calls, today, sessions, handler, config, settings, recorded: () => recorded };
}

const allOn = { notifications: { browser: true, sound: true } };

describe('completion handler', () => {
  it('records exactly one session per work completion, with sound, notification and toast', async () => {
    const { engine, clock, calls, today } = setup(allOn);
    engine.start();
    clock.advance(25 * 60_000);
    engine.tick();
    engine.tick();
    const list = await today();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ taskId: 'task1', type: 'work', plannedMs: 25 * 60_000, localDate: '2026-03-20' });
    expect(calls).toEqual(['sound', 'notify', 'toast']);
  });

  it('notifies once per recorded work session and never for skip, reset or breaks', async () => {
    const a = setup(allOn);
    a.engine.start();
    a.clock.advance(25 * 60_000);
    a.engine.tick();
    await a.today();
    expect(a.recorded()).toBe(1);
    const b = setup(allOn);
    b.engine.start();
    b.engine.skip();
    b.engine.start();
    b.engine.reset();
    await b.today();
    expect(b.recorded()).toBe(0);
  });

  it('records the task selected at completion, or none when it no longer exists', async () => {
    selected = null;
    const a = setup(allOn);
    a.engine.start();
    a.clock.advance(25 * 60_000);
    a.engine.tick();
    expect((await a.today())[0].taskId).toBeNull();
    selected = 'task1';
  });

  it('plays only the sound when a break ends', async () => {
    const { engine, clock, calls, today } = setup(allOn);
    engine.skip(); // work -> short break
    engine.start();
    clock.advance(5 * 60_000);
    engine.tick();
    expect(calls).toEqual(['sound']);
    expect(await today()).toHaveLength(0);
  });

  it('respects the sound and notification settings', async () => {
    const { engine, clock, calls } = setup({ notifications: { browser: false, sound: false } });
    engine.start();
    clock.advance(25 * 60_000);
    engine.tick();
    expect(calls).toEqual(['toast']);
  });

  it('records nothing for skip, reset and breaks, and stays silent for skip and reset', async () => {
    const { engine, clock, today, calls } = setup(allOn);
    engine.start();
    engine.skip(); // skipped work -> short break
    engine.start();
    engine.reset();
    engine.start();
    clock.advance(5 * 60_000);
    engine.tick(); // short break completes -> work
    expect(await today()).toHaveLength(0);
    expect(calls).toEqual(['sound']); // only the short break's natural end
  });

  it('records a zero-remaining restore once, silently', async () => {
    const { handler, config, today, calls } = setup(allOn);
    const clock = new FakeClock(Date.UTC(2026, 2, 20, 12, 0));
    const endsAt = Date.UTC(2026, 2, 20, 11, 0);
    createTimerEngine({
      clock,
      config,
      onEvent: handler,
      restore: {
        status: 'running',
        sessionType: 'work',
        plannedMs: 25 * 60_000,
        endsAt,
        remainingMs: null,
        savedAt: endsAt,
      },
    });
    const list = await today();
    expect(list).toHaveLength(1);
    expect(list[0].completedAt).toBe(endsAt);
    expect(calls).toEqual(['toast']);
  });

  it('a failing effect does not block the others', async () => {
    const store = new MemoryStore();
    const sessions = createSessionRepository(store);
    const calls: string[] = [];
    const handler = createCompletionHandler({
      sessions,
      newId: () => 'x',
      timeZone: () => TZ,
      getSelectedTaskId: async () => null,
      getSettings: () => ({ ...defaultSettings('en'), ...allOn }),
      effects: {
        playSound: () => {
          throw new Error('audio');
        },
        notify: () => {
          throw new Error('notify');
        },
        toast: () => calls.push('toast'),
      },
    });
    handler({ type: 'completed', sessionType: 'work', plannedMs: 1, completedAt: Date.UTC(2026, 2, 20), restored: false });
    expect(calls).toEqual(['toast']);
    await flush();
    expect(await sessions.listByLocalDate('2026-03-20')).toHaveLength(1);
  });

  it('feeds the cycle counter: the fourth completion leads to a long break, also after a reload', async () => {
    const store = new MemoryStore();
    const a = setup(allOn, store);
    for (let i = 0; i < 3; i++) {
      a.engine.start();
      a.clock.advance(25 * 60_000);
      a.engine.tick();
      a.engine.start(); // short break
      a.clock.advance(5 * 60_000);
      a.engine.tick();
    }
    const count = countWorkSessionsOn(await a.today(), '2026-03-20');
    expect(count).toBe(3);
    // "Reload": a new engine whose counter comes from the stored sessions.
    const b = createTimerEngine({
      clock: a.clock,
      config: a.config,
      completedWorkInCycle: count % 4,
      onEvent: a.handler,
    });
    b.start();
    a.clock.advance(25 * 60_000);
    b.tick();
    expect(b.getSnapshot().sessionType).toBe('longBreak');
  });

  it('keeps sessions completed in two tabs', async () => {
    const store = new MemoryStore();
    const t1 = setup(allOn, store);
    const t2 = setup(allOn, store);
    t1.engine.start();
    t2.engine.start();
    t1.clock.advance(25 * 60_000);
    t2.clock.advance(25 * 60_000);
    t1.engine.tick();
    t2.engine.tick();
    expect(await t1.today()).toHaveLength(2);
  });
});
