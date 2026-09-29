import type { SessionRepository } from '@/domain/repositories';
import { sessionFromCompletion } from '@/domain/sessions/record';
import type { IdGenerator } from '@/domain/sessions/record';
import type { UserSettings } from '@/domain/settings';
import type { TimerEvent } from '@/domain/timer';

export interface CompletionEffects {
  playSound(volume: number): void;
  /** Should show a browser notification if permitted; must not throw (but is guarded anyway). */
  notify(): void;
  toast(): void;
}

export interface CompletionDeps {
  sessions: SessionRepository;
  newId: IdGenerator;
  timeZone: () => string;
  /** The task selected at the moment of completion, or null when none or it no longer exists. */
  getSelectedTaskId: () => Promise<string | null>;
  getSettings: () => UserSettings;
  effects: CompletionEffects;
  /** Called after a work session has been saved, so views can refresh. */
  onSessionRecorded?: () => void;
}

const guard = (fn: () => void) => {
  try {
    fn();
  } catch {
    // One failing adapter must never block the others or the timer.
  }
};

/**
 * The single reaction to engine events (ARCHITECTURE 4.7). Only a completed work session
 * is recorded (any completed session plays the sound); a restored completion (zero remaining on reload) is recorded and toasted
 * but makes no sound and sends no notification.
 */
export function createCompletionHandler(deps: CompletionDeps): (event: TimerEvent) => void {
  return (event) => {
    if (event.type !== 'completed') return;
    // Every finished session (focus, short break, long break) plays the sound; a restored
    // completion never does.
    if (!event.restored) {
      const settings = deps.getSettings();
      if (settings.notifications.sound) guard(() => deps.effects.playSound(settings.audio.volume));
    }
    if (event.sessionType !== 'work') return;
    // Resolved at completion time (the id and zone are captured now), recorded when the read returns.
    const id = deps.newId();
    const timeZone = deps.timeZone();
    void deps
      .getSelectedTaskId()
      .catch(() => null)
      .then((taskId) => {
        const session = sessionFromCompletion(event, { id, taskId, timeZone });
        return session ? deps.sessions.add(session).then(() => guard(() => deps.onSessionRecorded?.())) : undefined;
      })
      .catch(() => {});

    if (!event.restored) {
      if (deps.getSettings().notifications.browser) guard(() => deps.effects.notify());
    }
    guard(() => deps.effects.toast());
  };
}
