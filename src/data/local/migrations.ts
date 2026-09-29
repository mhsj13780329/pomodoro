import type { KeyValueStore } from '../storage';
import { KEYS } from './keys';

/** Each migration upgrades stored data from version index to index + 1. */
export type Migration = (store: KeyValueStore) => void;

function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.get(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// v0 -> v1: legacy flat settings ({ theme, language, workMinutes, ... }) become the nested shape.
// Corrupt data is dropped so defaults apply.
const v0ToV1: Migration = (store) => {
  const old = readJson(store, KEYS.settings);
  if (old === undefined) {
    store.remove(KEYS.settings);
    return;
  }
  if (typeof old !== 'object' || old === null || Array.isArray(old)) {
    store.remove(KEYS.settings);
    return;
  }
  const o = old as Record<string, unknown>;
  store.set(
    KEYS.settings,
    JSON.stringify({
      theme: o.theme,
      language: o.language,
      numerals: o.numerals,
      timer: {
        workMinutes: o.workMinutes,
        shortBreakMinutes: o.shortBreakMinutes,
        longBreakMinutes: o.longBreakMinutes,
        sessionsBeforeLongBreak: o.sessionsBeforeLongBreak,
        autoStartNext: o.autoStart,
      },
    }),
  );
};

export const migrations: Migration[] = [v0ToV1];
export const CURRENT_VERSION = migrations.length;

export function readVersion(store: KeyValueStore): number {
  const n = Number(store.get(KEYS.schemaVersion));
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/** Runs pending migrations in order. Data from a newer version is left untouched. */
export function runMigrations(store: KeyValueStore, list: Migration[] = migrations): void {
  let version = readVersion(store);
  while (version < list.length) {
    list[version](store);
    version += 1;
    store.set(KEYS.schemaVersion, String(version));
  }
}
