import { describe, expect, it } from 'vitest';
import { sessionFromCompletion } from './record';

const ctx = { id: 'a', taskId: 't1', timeZone: 'Asia/Tehran' };

describe('sessionFromCompletion', () => {
  it('records a work completion with the local date', () => {
    const completedAt = Date.UTC(2026, 0, 9, 20, 40); // 00:10 next day in Tehran
    const s = sessionFromCompletion(
      { type: 'completed', sessionType: 'work', plannedMs: 1500000, completedAt, restored: false },
      ctx,
    );
    expect(s).toEqual({
      id: 'a',
      taskId: 't1',
      type: 'work',
      plannedMs: 1500000,
      completedAt,
      localDate: '2026-01-10',
    });
  });

  it('ignores breaks and other events', () => {
    expect(
      sessionFromCompletion(
        { type: 'completed', sessionType: 'shortBreak', plannedMs: 1, completedAt: 0, restored: false },
        ctx,
      ),
    ).toBeNull();
    expect(sessionFromCompletion({ type: 'skipped', sessionType: 'work', at: 0 }, ctx)).toBeNull();
  });
});
