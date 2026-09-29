import type { KeyValueStore } from './storage';
import { MemoryStore } from './memory/MemoryStore';

class WebStore implements KeyValueStore {
  readonly persistent = true;
  constructor(private readonly storage: Storage) {}
  get(key: string) {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string) {
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  remove(key: string) {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  keys(prefix: string) {
    try {
      const out: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k !== null && k.startsWith(prefix)) out.push(k);
      }
      return out;
    } catch {
      return [];
    }
  }
}

const PROBE_KEY = 'pomodoro.probe';

/** Wraps a Storage obtained lazily; falls back to memory when it is missing or unusable. */
export function createWebStore(getStorage: () => Storage | undefined): KeyValueStore {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      return new WebStore(storage);
    }
  } catch {
    /* unavailable (private mode, blocked, SSR) */
  }
  return new MemoryStore(false);
}
