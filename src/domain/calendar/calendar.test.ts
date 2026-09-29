import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarDayParts,
  dayOfWeek,
  daysBetween,
  endOfJalaliMonth,
  endOfMonthIn,
  fromJalali,
  gregorianMonthLength,
  isJalaliLeapYear,
  jalaliMonthLength,
  localDateOf,
  monthKeyIn,
  monthName,
  parseLocalDate,
  startOfGregorianMonth,
  startOfJalaliMonth,
  startOfJalaliYear,
  startOfMonthIn,
  startOfWeek,
  toJalali,
  weekDates,
  weekdayName,
  weekStartFor,
} from './index';

const j = (date: string) => {
  const p = toJalali(date);
  return `${p.year}/${p.month}/${p.day}`;
};

describe('Gregorian arithmetic', () => {
  it('validates and parses', () => {
    expect(parseLocalDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(() => parseLocalDate('2025-02-29')).toThrow(RangeError);
    expect(() => parseLocalDate('2025-2-9')).toThrow(RangeError);
  });

  it('month lengths and leap years (including 1900 and 2000)', () => {
    expect(gregorianMonthLength(2024, 2)).toBe(29);
    expect(gregorianMonthLength(2025, 2)).toBe(28);
    expect(gregorianMonthLength(1900, 2)).toBe(28);
    expect(gregorianMonthLength(2000, 2)).toBe(29);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2026-03-01', 366)).toBe('2027-03-02');
  });

  it('day counts are unaffected by DST days', () => {
    for (const d of ['2026-03-08', '2026-11-01', '2026-03-29', '2026-10-25']) {
      expect(daysBetween(addDays(d, -1), d)).toBe(1);
      expect(daysBetween(d, addDays(d, 1))).toBe(1);
    }
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-04-01', '2026-03-01')).toBe(-31);
  });

  it('day of week', () => {
    expect(dayOfWeek('2026-09-30')).toBe(3); // Wednesday
    expect(dayOfWeek('2000-01-01')).toBe(6); // Saturday
  });

  it('week starts on Saturday or Monday, across month and year boundaries', () => {
    // 2026-09-30 is a Wednesday.
    expect(startOfWeek('2026-09-30', 'monday')).toBe('2026-09-28');
    expect(startOfWeek('2026-09-30', 'saturday')).toBe('2026-09-26');
    // A start day maps to itself.
    expect(startOfWeek('2026-09-28', 'monday')).toBe('2026-09-28');
    expect(startOfWeek('2026-09-26', 'saturday')).toBe('2026-09-26');
    // Saturday itself for a Monday-start week belongs to the previous week.
    expect(startOfWeek('2026-09-26', 'monday')).toBe('2026-09-21');
    // Sunday with Saturday start: the day after the start.
    expect(startOfWeek('2026-09-27', 'saturday')).toBe('2026-09-26');
    // Year boundary: 2026-01-01 is a Thursday.
    expect(startOfWeek('2026-01-01', 'monday')).toBe('2025-12-29');
    expect(startOfWeek('2026-01-01', 'saturday')).toBe('2025-12-27');
    expect(weekDates('2026-01-01', 'monday')).toEqual([
      '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04',
    ]);
  });

  it('Gregorian month boundaries', () => {
    expect(startOfGregorianMonth('2024-02-15')).toBe('2024-02-01');
    expect(endOfMonthIn('2024-02-15', 'gregorian')).toBe('2024-02-29');
    expect(endOfMonthIn('2025-12-05', 'gregorian')).toBe('2025-12-31');
  });
});

describe('Jalali conversion', () => {
  it('known anchors (Nowruz)', () => {
    expect(fromJalali(1405, 1, 1)).toBe('2026-03-21');
    expect(fromJalali(1404, 1, 1)).toBe('2025-03-21');
    expect(fromJalali(1403, 1, 1)).toBe('2024-03-20');
    expect(j('2026-03-21')).toBe('1405/1/1');
    expect(j('2024-03-20')).toBe('1403/1/1');
    expect(j('2026-09-30')).toBe('1405/7/8');
  });

  it('Esfand to Farvardin, leap and non-leap years', () => {
    // 1403 is leap (30 Esfand), 1404 is not.
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(j('2025-03-19')).toBe('1403/12/29');
    expect(j('2025-03-20')).toBe('1403/12/30');
    expect(j('2025-03-21')).toBe('1404/1/1');
    expect(j('2026-03-20')).toBe('1404/12/29');
    expect(j('2026-03-21')).toBe('1405/1/1');
  });

  it('month lengths: 31 for months 1-6, 30 for 7-11', () => {
    for (let m = 1; m <= 6; m++) expect(jalaliMonthLength(1404, m)).toBe(31);
    for (let m = 7; m <= 11; m++) expect(jalaliMonthLength(1404, m)).toBe(30);
  });

  it('round-trips every day over many years', () => {
    let d = '1990-01-01';
    for (let i = 0; i < 365 * 60; i++, d = addDays(d, 1)) {
      const p = toJalali(d);
      expect(fromJalali(p.year, p.month, p.day)).toBe(d);
    }
  });

  it('rejects invalid Jalali dates', () => {
    expect(() => fromJalali(1404, 12, 30)).toThrow(RangeError);
    expect(() => fromJalali(1404, 13, 1)).toThrow(RangeError);
    expect(() => fromJalali(1404, 1, 32)).toThrow(RangeError);
  });

  it('Jalali month and year boundaries', () => {
    expect(startOfJalaliMonth('2026-09-30')).toBe('2026-09-23'); // 1 Mehr 1405
    expect(endOfJalaliMonth('2026-09-30')).toBe('2026-10-22'); // 30 Mehr
    expect(startOfJalaliMonth('2026-03-20')).toBe('2026-02-20'); // 1 Esfand 1404 (29 days)
    expect(endOfJalaliMonth('2026-03-20')).toBe('2026-03-20');
    expect(endOfJalaliMonth('2025-03-10')).toBe('2025-03-20'); // leap Esfand 1403
    expect(startOfJalaliYear('2026-03-20')).toBe('2025-03-21');
    expect(startOfJalaliYear('2026-03-21')).toBe('2026-03-21');
  });

  it('generic helpers pick the calendar', () => {
    expect(startOfMonthIn('2026-09-30', 'jalali')).toBe('2026-09-23');
    expect(startOfMonthIn('2026-09-30', 'gregorian')).toBe('2026-09-01');
    expect(endOfMonthIn('2026-09-30', 'jalali')).toBe('2026-10-22');
    expect(monthKeyIn('2026-03-21', 'jalali')).toBe('1405-01');
    expect(monthKeyIn('2026-03-21', 'gregorian')).toBe('2026-03');
    expect(weekStartFor('jalali')).toBe('saturday');
    expect(weekStartFor('gregorian')).toBe('monday');
  });
});

describe('secondary calendar and names', () => {
  it('returns secondary parts only when different from primary', () => {
    expect(calendarDayParts('2026-03-21', 'jalali', 'gregorian')).toEqual({
      primary: { year: 1405, month: 1, day: 1 },
      secondary: { year: 2026, month: 3, day: 21 },
    });
    expect(calendarDayParts('2026-03-21', 'gregorian').secondary).toBeUndefined();
    expect(calendarDayParts('2026-03-21', 'gregorian', 'gregorian').secondary).toBeUndefined();
  });

  it('month and weekday names come from Intl for supplied dates', () => {
    expect(monthName('gregorian', 3, 'en-US')).toBe('March');
    expect(monthName('jalali', 1, 'en-US')).toBe('Farvardin');
    expect(monthName('jalali', 12, 'en-US')).toBe('Esfand');
    expect(monthName('jalali', 1, 'fa-IR')).toBe('فروردین');
    expect(weekdayName('2026-09-30', 'gregorian', 'en-US')).toBe('Wednesday');
    expect(weekdayName('2026-09-30', 'jalali', 'fa-IR')).toBe('چهارشنبه');
  });
});

describe('localDateOf with explicit zones and DST', () => {
  it('New York spring forward (2026-03-08)', () => {
    // 02:00 EST -> 03:00 EDT. Local midnight is 05:00 UTC; next midnight 04:00 UTC.
    const midnight = Date.UTC(2026, 2, 8, 5, 0, 0);
    expect(localDateOf(midnight - 1, 'America/New_York')).toBe('2026-03-07');
    expect(localDateOf(midnight, 'America/New_York')).toBe('2026-03-08');
    const next = Date.UTC(2026, 2, 9, 4, 0, 0);
    expect(localDateOf(next - 1, 'America/New_York')).toBe('2026-03-08');
    expect(localDateOf(next, 'America/New_York')).toBe('2026-03-09');
  });

  it('New York fall back (2026-11-01, 25-hour day)', () => {
    const midnight = Date.UTC(2026, 10, 1, 4, 0, 0);
    expect(localDateOf(midnight - 1, 'America/New_York')).toBe('2026-10-31');
    expect(localDateOf(midnight, 'America/New_York')).toBe('2026-11-01');
    const next = Date.UTC(2026, 10, 2, 5, 0, 0);
    expect(localDateOf(next - 1, 'America/New_York')).toBe('2026-11-01');
    expect(localDateOf(next, 'America/New_York')).toBe('2026-11-02');
  });

  it('London spring forward (2026-03-29)', () => {
    const midnight = Date.UTC(2026, 2, 29, 0, 0, 0);
    expect(localDateOf(midnight - 1, 'Europe/London')).toBe('2026-03-28');
    expect(localDateOf(midnight, 'Europe/London')).toBe('2026-03-29');
    const next = Date.UTC(2026, 2, 29, 23, 0, 0); // BST midnight
    expect(localDateOf(next - 1, 'Europe/London')).toBe('2026-03-29');
    expect(localDateOf(next, 'Europe/London')).toBe('2026-03-30');
  });

  it('Tehran: fixed +03:30 now, historical DST in 2021', () => {
    // 2026: +03:30 all year. Nowruz eve 23:59 local stays on the old date.
    const tehranMidnight = Date.UTC(2026, 2, 20, 20, 30, 0);
    expect(localDateOf(tehranMidnight - 1, 'Asia/Tehran')).toBe('2026-03-20');
    expect(localDateOf(tehranMidnight, 'Asia/Tehran')).toBe('2026-03-21');
    expect(j(localDateOf(tehranMidnight - 1, 'Asia/Tehran'))).toBe('1404/12/29');
    expect(j(localDateOf(tehranMidnight, 'Asia/Tehran'))).toBe('1405/1/1');
    // 2021 summer: +04:30, local midnight of 2021-07-01 is 19:30 UTC the day before.
    const summer = Date.UTC(2021, 5, 30, 19, 30, 0);
    expect(localDateOf(summer - 1, 'Asia/Tehran')).toBe('2021-06-30');
    expect(localDateOf(summer, 'Asia/Tehran')).toBe('2021-07-01');
  });
});

describe('Intl persian calendar cross-check (DECISIONS D3 risk)', () => {
  const intl = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  function intlJalali(date: string) {
    const { year, month, day } = parseLocalDate(date);
    const d = new Date(0);
    d.setUTCFullYear(year, month - 1, day);
    d.setUTCHours(12);
    const parts = intl.formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  it('agrees with jalaali-js for every day of 1300-1500 AP', () => {
    let d = fromJalali(1300, 1, 1);
    const end = fromJalali(1500, 12, jalaliMonthLength(1500, 12));
    const mismatches: string[] = [];
    for (; d <= end; d = addDays(d, 1)) {
      const a = toJalali(d);
      const b = intlJalali(d);
      if (a.year !== b.year || a.month !== b.month || a.day !== b.day) mismatches.push(d);
    }
    // Record the finding: any disagreement here means jalaali-js stays the source of truth.
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});
