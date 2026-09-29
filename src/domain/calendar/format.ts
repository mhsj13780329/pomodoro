// Calendar-generic helpers and display data. Numerals are formatted elsewhere (i18n).
import type { CalendarSystem } from '../settings/types';
import {
  endOfGregorianMonth,
  parseLocalDate,
  startOfGregorianMonth,
  type WeekStart,
  type YMD,
} from './gregorian';
import { endOfJalaliMonth, fromJalali, startOfJalaliMonth, toJalali } from './jalali';

export type { CalendarSystem };

export function partsIn(date: string, calendar: CalendarSystem): YMD {
  return calendar === 'jalali' ? toJalali(date) : parseLocalDate(date);
}

export function startOfMonthIn(date: string, calendar: CalendarSystem): string {
  return calendar === 'jalali' ? startOfJalaliMonth(date) : startOfGregorianMonth(date);
}

export function endOfMonthIn(date: string, calendar: CalendarSystem): string {
  return calendar === 'jalali' ? endOfJalaliMonth(date) : endOfGregorianMonth(date);
}

/** Month key such as '1405-01' or '2026-03', for grouping in the given calendar. */
export function monthKeyIn(date: string, calendar: CalendarSystem): string {
  const { year, month } = partsIn(date, calendar);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Documented default: Saturday for Jalali, Monday for Gregorian (DECISIONS). */
export function weekStartFor(calendar: CalendarSystem): WeekStart {
  return calendar === 'jalali' ? 'saturday' : 'monday';
}

export interface CalendarDayParts {
  primary: YMD;
  secondary?: YMD;
}

/** Primary and optional secondary parts for a day cell. The secondary is shown smaller by the UI. */
export function calendarDayParts(
  date: string,
  primary: CalendarSystem,
  secondary?: CalendarSystem,
): CalendarDayParts {
  const result: CalendarDayParts = { primary: partsIn(date, primary) };
  if (secondary && secondary !== primary) result.secondary = partsIn(date, secondary);
  return result;
}

export type NameWidth = 'long' | 'short';

const nameFormatters = new Map<string, Intl.DateTimeFormat>();

function nameFormatter(calendar: CalendarSystem, locale: string, field: 'month' | 'weekday', width: NameWidth) {
  const key = `${calendar}|${locale}|${field}|${width}`;
  let f = nameFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar === 'jalali' ? 'persian' : 'gregory'}`, {
      timeZone: 'UTC',
      [field]: width,
    });
    nameFormatters.set(key, f);
  }
  return f;
}

// Names are looked up from an instant we build ourselves (noon UTC of the Gregorian date
// that jalaali-js says is the 1st of the month), so Intl's own Persian calendar arithmetic
// never decides which month it is (DECISIONS D3).
function noonUtc(date: string): Date {
  const { year, month, day } = parseLocalDate(date);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(12);
  return d;
}

export function monthName(
  calendar: CalendarSystem,
  month: number,
  locale: string,
  width: NameWidth = 'long',
): string {
  // Use the 1st of the month in a reference year to get an unambiguous date.
  const date = calendar === 'jalali' ? fromJalali(1400, month, 1) : `2021-${String(month).padStart(2, '0')}-01`;
  return nameFormatter(calendar, locale, 'month', width).format(noonUtc(date));
}

export function weekdayName(date: string, calendar: CalendarSystem, locale: string, width: NameWidth = 'long') {
  return nameFormatter(calendar, locale, 'weekday', width).format(noonUtc(date));
}
