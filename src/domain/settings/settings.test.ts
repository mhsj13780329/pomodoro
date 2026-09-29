import { describe, expect, it } from 'vitest';
import { applySettingsPatch, defaultSettings, normalizeSettings } from '@/domain/settings';

describe('defaultSettings', () => {
  it('uses Persian first-run defaults', () => {
    const s = defaultSettings();
    expect([s.language, s.numerals, s.calendar.primary]).toEqual(['fa', 'persian', 'jalali']);
    expect(s.timer).toMatchObject({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 });
  });
  it('uses Latin/Gregorian defaults for English', () => {
    const s = defaultSettings('en');
    expect([s.numerals, s.calendar.primary]).toEqual(['latin', 'gregorian']);
  });
});

describe('normalizeSettings', () => {
  it('returns defaults for garbage', () => {
    for (const raw of [null, undefined, 5, 'x', [], {}]) expect(normalizeSettings(raw)).toEqual(defaultSettings());
  });
  it('keeps valid values and repairs invalid ones', () => {
    const s = normalizeSettings({
      theme: 'dark',
      language: 'en',
      numerals: 'nope',
      timer: { workMinutes: 9999, shortBreakMinutes: 'a', sessionsBeforeLongBreak: 0.4 },
      audio: { volume: 7 },
    });
    expect(s.theme).toBe('dark');
    expect(s.numerals).toBe('latin');
    expect(s.timer.workMinutes).toBe(180);
    expect(s.timer.shortBreakMinutes).toBe(5);
    expect(s.timer.sessionsBeforeLongBreak).toBe(1);
    expect(s.audio.volume).toBe(1);
  });
  it('keeps independent settings independent', () => {
    const s = normalizeSettings({ language: 'en', numerals: 'persian', calendar: { primary: 'jalali' } });
    expect([s.language, s.numerals, s.calendar.primary]).toEqual(['en', 'persian', 'jalali']);
  });
});

describe('applySettingsPatch', () => {
  it('merges nested objects one level deep', () => {
    const s = applySettingsPatch(defaultSettings(), { timer: { workMinutes: 50 }, theme: 'light' });
    expect(s.timer).toMatchObject({ workMinutes: 50, shortBreakMinutes: 5 });
    expect(s.theme).toBe('light');
  });
});
