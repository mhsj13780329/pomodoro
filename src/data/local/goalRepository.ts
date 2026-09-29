import type { GoalRepository } from '@/domain/repositories';
import { normalizeGoal } from '@/domain/goals';
import type { KeyValueStore } from '../storage';
import { KEYS } from './keys';

/** A single value, so a plain overwrite is safe. Unset or corrupt data loads as null. */
export function createGoalRepository(store: KeyValueStore): GoalRepository {
  return {
    async load() {
      const raw = store.get(KEYS.goal);
      if (raw === null) return null;
      try {
        return normalizeGoal(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async save(goal) {
      store.set(KEYS.goal, JSON.stringify(normalizeGoal(goal)));
    },
  };
}
