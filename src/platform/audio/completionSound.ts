// A short synthesized two-tone chime: no asset to ship or load. All failures are swallowed.
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (context) return context;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

/** Call from a user gesture (Start) so later playback from a timer callback is allowed. */
export function unlockAudio(): void {
  try {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    // ignore
  }
}

export function playCompletionSound(volume: number): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const level = Math.min(1, Math.max(0, volume)) * 0.4;
    const start = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = start + i * 0.22;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  } catch {
    // ignore
  }
}
