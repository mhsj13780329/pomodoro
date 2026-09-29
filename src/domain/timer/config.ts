import type { TimerSettings } from '../settings/types';
import type { SessionType, TimerConfig } from './types';

const MINUTE = 60_000;

export function timerConfigFromSettings(s: TimerSettings): TimerConfig {
  return {
    workMs: s.workMinutes * MINUTE,
    shortBreakMs: s.shortBreakMinutes * MINUTE,
    longBreakMs: s.longBreakMinutes * MINUTE,
    sessionsBeforeLongBreak: s.sessionsBeforeLongBreak,
    autoStartNext: s.autoStartNext,
  };
}

export function plannedMsFor(type: SessionType, config: TimerConfig): number {
  if (type === 'work') return config.workMs;
  return type === 'shortBreak' ? config.shortBreakMs : config.longBreakMs;
}
