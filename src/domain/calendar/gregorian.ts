// Gregorian local-date arithmetic on 'YYYY-MM-DD' strings (DECISIONS D3).
// Everything goes through Date.UTC on the date parts only, so DST never matters.
export type WeekStart = 'saturday' | 'monday';

export interface YMD {
  year: number;
  month: number; // 1-12
  day: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function formatLocalDate({ year, month, day }: YMD): string {
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(year, 4)}-${p(month, 2)}-${p(day, 2)}`;
}

export function gregorianMonthLength(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidLocalDate(date: string): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= gregorianMonthLength(year, month);
}

export function parseLocalDate(date: string): YMD {
  if (!isValidLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  const m = DATE_RE.exec(date)!;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function toDayIndex(date: string): number {
  const { year, month, day } = parseLocalDate(date);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day); // setUTCFullYear avoids the 0-99 year quirk of Date.UTC
  return Math.round(d.getTime() / MS_PER_DAY);
}

function fromDayIndex(index: number): string {
  const d = new Date(index * MS_PER_DAY);
  return formatLocalDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export function addDays(date: string, days: number): string {
  return fromDayIndex(toDayIndex(date) + days);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return toDayIndex(b) - toDayIndex(a);
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(date: string): number {
  return new Date(toDayIndex(date) * MS_PER_DAY).getUTCDay();
}

const WEEK_START_DOW: Record<WeekStart, number> = { saturday: 6, monday: 1 };

export function startOfWeek(date: string, weekStart: WeekStart): string {
  const offset = (dayOfWeek(date) - WEEK_START_DOW[weekStart] + 7) % 7;
  return addDays(date, -offset);
}

/** The seven dates of the calendar week containing `date`, in order. */
export function weekDates(date: string, weekStart: WeekStart): string[] {
  const start = startOfWeek(date, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfGregorianMonth(date: string): string {
  const { year, month } = parseLocalDate(date);
  return formatLocalDate({ year, month, day: 1 });
}

export function endOfGregorianMonth(date: string): string {
  const { year, month } = parseLocalDate(date);
  return formatLocalDate({ year, month, day: gregorianMonthLength(year, month) });
}
