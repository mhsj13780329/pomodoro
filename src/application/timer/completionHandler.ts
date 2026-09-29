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
  /** The task selected at the moment of completion, or null (wired to real tasks in M7). */
  getSelectedTaskId: () => string | null;
  getSettings: () => UserSettings;
  effects: CompletionEffects;
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
    const session = sessionFromCompletion(event, {
      id: deps.newId(),
      taskId: deps.getSelectedTaskId(),
      timeZone: deps.timeZone(),
    });
    if (!session) return;

    void deps.sessions.add(session).catch(() => {});

    if (!event.restored) {
      if (deps.getSettings().notifications.browser) guard(() => deps.effects.notify());
    }
    guard(() => deps.effects.toast());
  };
}
