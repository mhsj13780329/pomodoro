import type { KeyValueStore } from '../storage';
import { createWebStore } from '../webStore';

/** Shared (all tabs) store. Only src/data/local may touch localStorage. */
export function createLocalStore(): KeyValueStore {
  return createWebStore(() => (typeof window === 'undefined' ? undefined : window.localStorage));
}
