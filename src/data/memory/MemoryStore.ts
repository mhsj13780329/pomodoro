import type { KeyValueStore } from '../storage';

export class MemoryStore implements KeyValueStore {
  private readonly map = new Map<string, string>();
  constructor(readonly persistent = false) {}
  get(key: string) {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.map.set(key, value);
    return true;
  }
  remove(key: string) {
    this.map.delete(key);
  }
}
