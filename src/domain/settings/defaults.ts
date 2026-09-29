import type { Language, UserSettings } from './types';

// Language, numerals and calendar are independent settings. Only these first-run
// defaults derive from the language (docs/DECISIONS.md, resolved ambiguities).
export function defaultSettings(language: Language = 'fa'): UserSettings {
  const persian = language === 'fa';
  return {
    timer: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
      autoStartNext: false,
    },
    theme: 'system',
    language,
    numerals: persian ? 'persian' : 'latin',
    calendar: { primary: persian ? 'jalali' : 'gregorian', showSecondary: false },
    notifications: { browser: false, sound: true },
    audio: { enabled: true, volume: 0.5, soundId: null },
    visualization: 'digital',
  };
}
