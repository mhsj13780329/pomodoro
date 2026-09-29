export type Language = 'fa' | 'en';
export type ThemeChoice = 'system' | 'light' | 'dark';
export type NumeralSystem = 'persian' | 'latin';
export type CalendarSystem = 'jalali' | 'gregorian';
export type Visualization = 'digital' | 'analog';

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartNext: boolean;
}

export interface UserSettings {
  timer: TimerSettings;
  theme: ThemeChoice;
  language: Language;
  numerals: NumeralSystem;
  calendar: { primary: CalendarSystem; showSecondary: boolean };
  notifications: { browser: boolean; sound: boolean };
  audio: { enabled: boolean; volume: number; soundId: string | null };
  visualization: Visualization;
}

export type SettingsPatch = {
  [K in keyof UserSettings]?: UserSettings[K] extends object ? Partial<UserSettings[K]> : UserSettings[K];
};
