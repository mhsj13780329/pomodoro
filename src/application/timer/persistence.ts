import type { TimerStateRepository } from '@/domain/repositories';
import type { Clock, TimerEngine } from '@/domain/timer';

export interface TimerPersistence {
  /** Writes the current state now (used on pagehide and when the tab is hidden). */
  saveNow(): void;
  dispose(): void;
}

// Saves on every state change (snapshot.version), never per tick, never periodically.
// The initial save matters: a restore that completed a session must not be replayed by
// the next reload.
export function attachTimerPersistence(deps: {
  engine: TimerEngine;
  repo: TimerStateRepository;
  clock: Clock;
}): TimerPersistence {
  const { engine, repo, clock } = deps;
  const saveNow = () => {
    void repo.save({ ...engine.getState(), savedAt: clock.now() });
  };
  let lastVersion = engine.getSnapshot().version;
  saveNow();
  const unsubscribe = engine.subscribe(() => {
    const { version } = engine.getSnapshot();
    if (version === lastVersion) return;
    lastVersion = version;
    saveNow();
  });
  return { saveNow, dispose: unsubscribe };
}
