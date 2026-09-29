import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../memory/MemoryStore';
import { sessionsKey } from './keys';
import { createSessionRepository } from './sessionRepository';
import type { PomodoroSession } from '@/domain/sessions/types';

const s = (id: string, localDate: string): PomodoroSession => ({
  id,
  taskId: null,
  type: 'work',
  plannedMs: 1500000,
  completedAt: 1,
  localDate,
});

describe('session repository', () => {
  it('adds and lists by local date', async () => {
    const repo = createSessionRepository(new MemoryStore());
    await repo.add(s('a', '2026-03-20'));
    await repo.add(s('b', '2026-03-21'));
    expect((await repo.listByLocalDate('2026-03-20')).map((x) => x.id)).toEqual(['a']);
    expect(await repo.listByLocalDate('2026-03-22')).toEqual([]);
  });

  it('buckets by month', async () => {
    const store = new MemoryStore();
    const repo = createSessionRepository(store);
    await repo.add(s('a', '2026-03-31'));
    await repo.add(s('b', '2026-04-01'));
    expect(store.get(sessionsKey('2026-03'))).toContain('"a"');
    expect(store.get(sessionsKey('2026-03'))).not.toContain('"b"');
    expect(store.get(sessionsKey('2026-04'))).toContain('"b"');
  });

  it('falls back to empty on corrupt data and drops bad items', async () => {
    const store = new MemoryStore();
    store.set(sessionsKey('2026-03'), '{not json');
    const repo = createSessionRepository(store);
    expect(await repo.listByLocalDate('2026-03-20')).toEqual([]);
    store.set(sessionsKey('2026-03'), JSON.stringify([{ id: 1 }, s('ok', '2026-03-20')]));
    expect((await repo.listByLocalDate('2026-03-20')).map((x) => x.id)).toEqual(['ok']);
    await repo.add(s('new', '2026-03-20'));
    expect((await repo.listByLocalDate('2026-03-20')).map((x) => x.id)).toEqual(['ok', 'new']);
  });

  it('keeps sessions from two tabs (two repositories, one store)', async () => {
    const store = new MemoryStore();
    const tabA = createSessionRepository(store);
    const tabB = createSessionRepository(store);
    await tabA.listByLocalDate('2026-03-20'); // A has "seen" the empty state
    await tabB.add(s('b', '2026-03-20'));
    await tabA.add(s('a', '2026-03-20'));
    expect((await tabA.listByLocalDate('2026-03-20')).map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('lists all sessions across months, skipping corrupt months and other keys', async () => {
    const store = new MemoryStore();
    const repo = createSessionRepository(store);
    expect(await repo.listAll()).toEqual([]);
    await repo.add(s('b', '2026-04-01'));
    await repo.add(s('a', '2026-03-31'));
    store.set(sessionsKey('2026-05'), '{bad');
    store.set('pomodoro.tasks', '[]');
    expect((await repo.listAll()).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('does not duplicate the same session id', async () => {
    const repo = createSessionRepository(new MemoryStore());
    await repo.add(s('a', '2026-03-20'));
    await repo.add(s('a', '2026-03-20'));
    expect(await repo.listByLocalDate('2026-03-20')).toHaveLength(1);
  });
});
