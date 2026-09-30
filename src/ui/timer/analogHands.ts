/** Remaining time as a 12-hour analog clock. Same whole-second rounding as `formatClock`. */
export function analogHands(remainingMs: number): { hourDeg: number; minuteDeg: number; secondDeg: number } {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600) % 12;
  return {
    secondDeg: seconds * 6,
    minuteDeg: minutes * 6 + seconds * 0.1,
    hourDeg: hours * 30 + minutes * 0.5 + seconds / 120,
  };
}
