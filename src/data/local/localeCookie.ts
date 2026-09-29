import { LOCALE_COOKIE } from '@/i18n';
import type { Locale } from '@/i18n';

/** Mirrors the language into a cookie so the server can render `lang` and `dir` on first paint. */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
