import { defaultSettings } from './defaults';
import type { SettingsPatch, UserSettings } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function int(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

/** Turns any stored value into valid settings. Invalid fields fall back to their defaults. */
export function normalizeSettings(raw: unknown): UserSettings {
  const src = isObj(raw) ? raw : {};
  const language = oneOf(src.language, ['fa', 'en'] as const, 'fa');
  // A missing numerals/calendar follows the (valid) language default, as on first run.
  const d = defaultSettings(language);
  const timer = isObj(src.timer) ? src.timer : {};
  const calendar = isObj(src.calendar) ? src.calendar : {};
  const notifications = isObj(src.notifications) ? src.notifications : {};
  const audio = isObj(src.audio) ? src.audio : {};
  return {
    timer: {
      workMinutes: int(timer.workMinutes, 1, 180, d.timer.workMinutes),
      shortBreakMinutes: int(timer.shortBreakMinutes, 1, 60, d.timer.shortBreakMinutes),
      longBreakMinutes: int(timer.longBreakMinutes, 1, 120, d.timer.longBreakMinutes),
      sessionsBeforeLongBreak: int(timer.sessionsBeforeLongBreak, 1, 12, d.timer.sessionsBeforeLongBreak),
      autoStartNext: bool(timer.autoStartNext, d.timer.autoStartNext),
    },
    theme: oneOf(src.theme, ['system', 'light', 'dark'] as const, d.theme),
    language,
    numerals: oneOf(src.numerals, ['persian', 'latin'] as const, d.numerals),
    calendar: {
      primary: oneOf(calendar.primary, ['jalali', 'gregorian'] as const, d.calendar.primary),
      showSecondary: bool(calendar.showSecondary, d.calendar.showSecondary),
    },
    notifications: {
      browser: bool(notifications.browser, d.notifications.browser),
      sound: bool(notifications.sound, d.notifications.sound),
    },
    audio: {
      enabled: bool(audio.enabled, d.audio.enabled),
      volume: num(audio.volume, 0, 1, d.audio.volume),
      soundId: typeof audio.soundId === 'string' ? audio.soundId : d.audio.soundId,
    },
    visualization: oneOf(src.visualization, ['digital', 'analog'] as const, d.visualization),
  };
}

/** Applies a partial update (one level deep) on top of current settings, then normalizes. */
export function applySettingsPatch(current: UserSettings, patch: SettingsPatch): UserSettings {
  const merged: Obj = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const base = (current as unknown as Obj)[key];
    merged[key] = isObj(base) && isObj(value) ? { ...base, ...value } : value;
  }
  return normalizeSettings(merged);
}
