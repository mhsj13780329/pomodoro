// Jalali conversion. The only module that imports jalaali-js (DECISIONS D3).
import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';
import { formatLocalDate, parseLocalDate, type YMD } from './gregorian';

export function toJalali(date: string): YMD {
  const { year, month, day } = parseLocalDate(date);
  const j = toJalaali(year, month, day);
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function fromJalali(year: number, month: number, day: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid Jalali date: ${year}/${month}/${day}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > jalaliMonthLength(year, month)) {
    throw new RangeError(`Invalid Jalali date: ${year}/${month}/${day}`);
  }
  const g = toGregorian(year, month, day);
  return formatLocalDate({ year: g.gy, month: g.gm, day: g.gd });
}

export function isJalaliLeapYear(year: number): boolean {
  return isLeapJalaaliYear(year);
}

export function jalaliMonthLength(year: number, month: number): number {
  return jalaaliMonthLength(year, month);
}

export function startOfJalaliMonth(date: string): string {
  const { year, month } = toJalali(date);
  return fromJalali(year, month, 1);
}

export function endOfJalaliMonth(date: string): string {
  const { year, month } = toJalali(date);
  return fromJalali(year, month, jalaliMonthLength(year, month));
}

export function startOfJalaliYear(date: string): string {
  return fromJalali(toJalali(date).year, 1, 1);
}
