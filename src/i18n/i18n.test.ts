import { describe, expect, it } from 'vitest';
import { dirOf, en, fa, formatClock, formatNumber, parseLocale, translate } from '@/i18n';

describe('dictionaries', () => {
  it('fa has exactly the keys of en', () => {
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort());
  });
  it('has no empty messages', () => {
    for (const d of [en, fa]) for (const v of Object.values(d)) expect(v.trim()).not.toBe('');
  });
});

describe('translate', () => {
  it('uses the requested locale', () => {
    expect(translate('en', 'nav.timer')).toBe('Timer');
    expect(translate('fa', 'nav.timer')).toBe('تایمر');
  });
});

describe('formatNumber', () => {
  const f = (locale: 'fa' | 'en', numerals: 'persian' | 'latin', v = 1234.5) =>
    formatNumber(v, { locale, numerals });
  it('Persian numerals in both languages', () => {
    expect(f('fa', 'persian')).toBe('۱٬۲۳۴٫۵');
    expect(f('en', 'persian', 25)).toBe('۲۵');
  });
  it('Latin numerals in both languages', () => {
    expect(f('en', 'latin')).toBe('1,234.5');
    expect(f('fa', 'latin', 25)).toBe('25');
  });
});

describe('formatClock', () => {
  it('formats mm:ss in both numeral systems', () => {
    expect(formatClock(25 * 60_000, { locale: 'en', numerals: 'latin' })).toBe('25:00');
    expect(formatClock(65_000, { locale: 'fa', numerals: 'persian' })).toBe('۰۱:۰۵');
  });
  it('handles zero and more than 99 minutes, rounding partial seconds up', () => {
    expect(formatClock(0, { locale: 'en', numerals: 'latin' })).toBe('00:00');
    expect(formatClock(180 * 60_000, { locale: 'en', numerals: 'latin' })).toBe('180:00');
    expect(formatClock(1, { locale: 'en', numerals: 'latin' })).toBe('00:01');
  });
});

describe('locale', () => {
  it('selects direction', () => {
    expect(dirOf('fa')).toBe('rtl');
    expect(dirOf('en')).toBe('ltr');
  });
  it('parses with Persian default', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('fa')).toBe('fa');
    expect(parseLocale(undefined)).toBe('fa');
    expect(parseLocale('de')).toBe('fa');
  });
});
