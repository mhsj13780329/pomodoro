export type Locale = 'fa' | 'en';
export type Direction = 'rtl' | 'ltr';

export const DEFAULT_LOCALE: Locale = 'fa';
export const LOCALE_COOKIE = 'pomodoro-locale';

/** Any unknown value falls back to the default (Persian). */
export function parseLocale(value: unknown): Locale {
  return value === 'en' || value === 'fa' ? value : DEFAULT_LOCALE;
}

export function dirOf(locale: Locale): Direction {
  return locale === 'fa' ? 'rtl' : 'ltr';
}
