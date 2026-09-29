import type { Clock } from './types';

export class FakeClock implements Clock {
  private current: number;

  constructor(start = 1_700_000_000_000) {
    this.current = start;
  }

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(ts: number): void {
    this.current = ts;
  }
}
