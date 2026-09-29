import { describe, expect, it } from 'vitest';
import { applyDevSeconds, parseDevSeconds } from './devOverrides';

const base = { workMs: 1, shortBreakMs: 2, longBreakMs: 3, sessionsBeforeLongBreak: 4, autoStartNext: false };

describe('dev overrides', () => {
  it('parses a positive number in development', () => {
    expect(parseDevSeconds('?devSeconds=5', 'development')).toBe(5);
    expect(parseDevSeconds('', 'development')).toBeNull();
    expect(parseDevSeconds('?devSeconds=abc', 'development')).toBeNull();
    expect(parseDevSeconds('?devSeconds=-1', 'development')).toBeNull();
  });
  it('is ignored in production', () => {
    expect(parseDevSeconds('?devSeconds=5', 'production')).toBeNull();
  });
  it('overrides only the durations', () => {
    expect(applyDevSeconds(base, 5)).toEqual({ ...base, workMs: 5000, shortBreakMs: 5000, longBreakMs: 5000 });
    expect(applyDevSeconds(base, null)).toBe(base);
  });
});
