import { describe, expect, it } from 'vitest';
import { localDateOf } from './localDate';

describe('localDateOf', () => {
  it('uses the time zone, not UTC', () => {
    const t = Date.UTC(2026, 2, 20, 22, 0, 0); // 22:00 UTC
    expect(localDateOf(t, 'UTC')).toBe('2026-03-20');
    expect(localDateOf(t, 'Asia/Tehran')).toBe('2026-03-21'); // 01:30 next day
    expect(localDateOf(t, 'America/New_York')).toBe('2026-03-20');
  });

  it('splits at local midnight', () => {
    const midnight = Date.UTC(2026, 0, 10, 0, 0, 0);
    expect(localDateOf(midnight - 1, 'UTC')).toBe('2026-01-09');
    expect(localDateOf(midnight, 'UTC')).toBe('2026-01-10');
    // Tehran is UTC+3:30 in January: local midnight is 20:30 UTC.
    const tehranMidnight = Date.UTC(2026, 0, 9, 20, 30, 0);
    expect(localDateOf(tehranMidnight - 1, 'Asia/Tehran')).toBe('2026-01-09');
    expect(localDateOf(tehranMidnight, 'Asia/Tehran')).toBe('2026-01-10');
  });

  it('handles a DST change day', () => {
    // US spring forward 2026-03-08 07:00 UTC (02:00 EST -> 03:00 EDT)
    const before = Date.UTC(2026, 2, 8, 6, 59, 0);
    const after = Date.UTC(2026, 2, 8, 7, 1, 0);
    expect(localDateOf(before, 'America/New_York')).toBe('2026-03-08');
    expect(localDateOf(after, 'America/New_York')).toBe('2026-03-08');
    // 04:30 UTC on Mar 9 is 00:30 EDT (Mar 9); 03:59 UTC is 23:59 EDT (Mar 8)
    expect(localDateOf(Date.UTC(2026, 2, 9, 4, 30), 'America/New_York')).toBe('2026-03-09');
    expect(localDateOf(Date.UTC(2026, 2, 9, 3, 59), 'America/New_York')).toBe('2026-03-08');
  });
});
