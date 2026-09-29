import type { KeyValueStore } from '../storage';
import { createWebStore } from '../webStore';

/** Per-tab store. Only src/data/session may touch sessionStorage. */
export function createSessionStore(): KeyValueStore {
  return createWebStore(() => (typeof window === 'undefined' ? undefined : window.sessionStorage));
}
