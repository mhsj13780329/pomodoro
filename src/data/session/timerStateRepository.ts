import type { TimerStateRepository } from '@/domain/repositories';
import { isPersistedTimerState } from '@/domain/timer';
import type { KeyValueStore } from '../storage';
import { SESSION_KEYS } from './keys';

// Per-tab state. Writes happen synchronously in the method body (before the first await),
// so a save from a pagehide handler completes before the page goes away.
export function createTimerStateRepository(store: KeyValueStore): TimerStateRepository {
  return {
    async load() {
      const raw = store.get(SESSION_KEYS.timer);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isPersistedTimerState(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    async save(state) {
      store.set(SESSION_KEYS.timer, JSON.stringify(state));
    },
    async loadSelectedTaskId() {
      return store.get(SESSION_KEYS.selectedTask);
    },
    async saveSelectedTaskId(id) {
      if (id === null) store.remove(SESSION_KEYS.selectedTask);
      else store.set(SESSION_KEYS.selectedTask, id);
    },
  };
}
