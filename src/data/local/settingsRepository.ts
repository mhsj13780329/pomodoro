import type { SettingsRepository } from '@/domain/repositories';
import { applySettingsPatch, normalizeSettings } from '@/domain/settings';
import type { UserSettings } from '@/domain/settings';
import type { KeyValueStore } from '../storage';
import { KEYS } from './keys';
import { runMigrations } from './migrations';

function read(store: KeyValueStore): UserSettings {
  const raw = store.get(KEYS.settings);
  if (raw === null) return normalizeSettings(undefined);
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings(undefined);
  }
}

export function createSettingsRepository(store: KeyValueStore): SettingsRepository {
  runMigrations(store);
  return {
    async load() {
      return read(store);
    },
    async update(patch) {
      // Read-modify-write against current storage in one synchronous block, so another
      // tab's changes to other fields are not overwritten by a stale cached copy.
      const next = applySettingsPatch(read(store), patch);
      store.set(KEYS.settings, JSON.stringify(next));
      return next;
    },
  };
}
