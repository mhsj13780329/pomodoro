import type { Locale } from './locale';
import { translate } from './translate';

export type NumeralSystem = 'persian' | 'latin';

export interface NumberFormatContext {
  locale: Locale;
  numerals: NumeralSystem;
}

/** `mm:ss` (minutes may exceed 99) in the chosen numeral system. */
export function formatClock(ms: number, ctx: NumberFormatContext): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const two = { minimumIntegerDigits: 2, useGrouping: false };
  const minutes = formatNumber(Math.floor(total / 60), ctx, two);
  const seconds = formatNumber(total % 60, ctx, two);
  return `${minutes}:${seconds}`;
}

/** Numerals are chosen independently of the language (PRD section 12). */
export function formatNumber(
  value: number,
  { locale, numerals }: NumberFormatContext,
  options?: Intl.NumberFormatOptions,
): string {
  const tag = `${locale === 'fa' ? 'fa-IR' : 'en-US'}-u-nu-${numerals === 'persian' ? 'arabext' : 'latn'}`;
  return new Intl.NumberFormat(tag, options).format(value);
}

/** Focus time: "25 min" below an hour, "1 h 30 min" above. Rounded to whole minutes. */
export function formatDuration(ms: number, ctx: NumberFormatContext): string {
  const total = Math.max(0, Math.round(ms / 60_000));
  const m = formatNumber(total % 60, ctx);
  if (total < 60) return translate(ctx.locale, 'duration.minutes', { m: formatNumber(total, ctx) });
  return translate(ctx.locale, 'duration.hoursMinutes', { h: formatNumber(Math.floor(total / 60), ctx), m });
}
