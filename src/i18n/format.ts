import type { Locale } from './locale';

export type NumeralSystem = 'persian' | 'latin';

export interface NumberFormatContext {
  locale: Locale;
  numerals: NumeralSystem;
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
