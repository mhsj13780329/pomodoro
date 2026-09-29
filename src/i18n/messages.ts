// Seed of the M3 localization core. `en` defines the shape, `fa` must satisfy it.
// M1 only has shell strings; M3 adds the locale cookie, formatters and the full system.

export const en = {
  'app.name': 'Pomodoro',
  'nav.label': 'Main navigation',
  'nav.timer': 'Timer',
  'nav.statistics': 'Statistics',
  'nav.settings': 'Settings',
  'theme.toggle': 'Dark theme',
  'page.timer.title': 'Timer',
  'page.statistics.title': 'Statistics',
  'page.settings.title': 'Settings',
  'page.placeholder': 'This section is coming soon.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

export const fa = {
  'app.name': 'پومودورو',
  'nav.label': 'ناوبری اصلی',
  'nav.timer': 'تایمر',
  'nav.statistics': 'آمار',
  'nav.settings': 'تنظیمات',
  'theme.toggle': 'حالت تاریک',
  'page.timer.title': 'تایمر',
  'page.statistics.title': 'آمار',
  'page.settings.title': 'تنظیمات',
  'page.placeholder': 'این بخش به‌زودی آماده می‌شود.',
} satisfies Messages;

// Temporary: always Persian until M3 adds locale selection.
export function t(key: MessageKey): string {
  return fa[key];
}
