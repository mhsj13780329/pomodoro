import { describe, expect, it } from 'vitest';
import { analogHands } from './analogHands';

describe('analogHands', () => {
  it('puts every hand at 12 when remaining is zero', () => {
    expect(analogHands(0)).toEqual({ hourDeg: 0, minuteDeg: 0, secondDeg: 0 });
  });

  it('maps 25:00 to 12:25:00 on a 12-hour face', () => {
    expect(analogHands(25 * 60_000)).toEqual({ hourDeg: 12.5, minuteDeg: 150, secondDeg: 0 });
  });

  it('maps 01:30 to 12:01:30', () => {
    expect(analogHands(90_000)).toEqual({ hourDeg: 0.5 + 30 / 120, minuteDeg: 6 + 3, secondDeg: 180 });
  });

  it('maps 180:00 (three hours) to 3:00:00', () => {
    expect(analogHands(180 * 60_000)).toEqual({ hourDeg: 90, minuteDeg: 0, secondDeg: 0 });
  });

  it('rounds partial seconds up like formatClock', () => {
    expect(analogHands(1)).toEqual({ hourDeg: 1 / 120, minuteDeg: 0.1, secondDeg: 6 });
  });
});
