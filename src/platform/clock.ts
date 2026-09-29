import type { Clock } from '@/domain/timer/types';

// Wall-clock time keeps advancing across computer sleep (ARCHITECTURE 4.3).
export const systemClock: Clock = { now: () => Date.now() };
