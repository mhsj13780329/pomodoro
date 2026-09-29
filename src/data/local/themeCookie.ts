import type { ThemeChoice } from '@/domain/settings';

export const THEME_COOKIE = 'pomodoro-theme';

/** Mirrors the theme into a cookie so the server can render the right class on first paint. */
export function writeThemeCookie(theme: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
