import type { TimerConfig } from '@/domain/timer';

/**
 * Dev-only shortcut for manual testing: `?devSeconds=5` makes every session 5 seconds long
 * for that page load. Ignored in production builds. Not user-facing.
 */
export function parseDevSeconds(search: string, nodeEnv: string | undefined): number | null {
  if (nodeEnv === 'production') return null;
  const raw = new URLSearchParams(search).get('devSeconds');
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n <= 3600 ? n : null;
}

export function applyDevSeconds(config: TimerConfig, seconds: number | null): TimerConfig {
  if (seconds === null) return config;
  const ms = seconds * 1000;
  return { ...config, workMs: ms, shortBreakMs: ms, longBreakMs: ms };
}
