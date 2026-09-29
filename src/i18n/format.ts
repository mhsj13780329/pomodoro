import type { Locale } from './locale';

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
