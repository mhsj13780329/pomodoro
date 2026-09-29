/** Minimal synchronous key-value port. Implementations never throw. */
export interface KeyValueStore {
  get(key: string): string | null;
  /** Returns false when the write failed (quota, blocked storage). */
  set(key: string, value: string): boolean;
  remove(key: string): void;
  /** False when this store is an in-memory fallback and data will not survive reload. */
  readonly persistent: boolean;
}
