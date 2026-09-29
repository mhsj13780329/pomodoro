// `en` defines the message shape; `fa` must satisfy it. Add keys to both in the same change.
export const en = {
  'app.name': 'Pomodoro',
  'nav.label': 'Main navigation',
  'nav.timer': 'Timer',
  'nav.statistics': 'Statistics',
  'nav.settings': 'Settings',
  'theme.toggle': 'Dark theme',
  'language.label': 'Language',
  'language.fa': 'فارسی',
  'language.en': 'English',
  'page.timer.title': 'Timer',
  'page.statistics.title': 'Statistics',
  'page.settings.title': 'Settings',
  'page.placeholder': 'This section is coming soon.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
