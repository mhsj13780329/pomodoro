import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/domain/settings';
import { MemoryStore } from '../memory/MemoryStore';
import { createWebStore } from '../webStore';
import { KEYS } from './keys';
import { readVersion } from './migrations';
import { createSettingsRepository } from './settingsRepository';

class FakeStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

const store = () => new MemoryStore(true);

describe('settings repository', () => {
  it('returns defaults on empty storage', async () => {
    expect(await createSettingsRepository(store()).load()).toEqual(defaultSettings());
  });

  it('falls back to defaults on corrupt JSON', async () => {
    const s = store();
    s.set(KEYS.schemaVersion, '1');
    s.set(KEYS.settings, '{not json');
    expect(await createSettingsRepository(s).load()).toEqual(defaultSettings());
  });

  it('persists updates', async () => {
    const s = store();
    await createSettingsRepository(s).update({ theme: 'dark' });
    expect((await createSettingsRepository(s).load()).theme).toBe('dark');
  });

  it('keeps both changes when two instances update different fields', async () => {
    const s = store();
    const a = createSettingsRepository(s);
    const b = createSettingsRepository(s);
    await a.load();
    await b.load();
    await a.update({ theme: 'dark' });
    await b.update({ timer: { workMinutes: 50 } });
    const result = await a.load();
    expect(result.theme).toBe('dark');
    expect(result.timer.workMinutes).toBe(50);
  });
});

describe('migrations', () => {
  const v0 = JSON.stringify({ theme: 'dark', language: 'en', workMinutes: 30, autoStart: true });

  it('migrates a v0 fixture to v1', async () => {
    const s = store();
    s.set(KEYS.settings, v0);
    const loaded = await createSettingsRepository(s).load();
    expect(loaded.theme).toBe('dark');
    expect(loaded.language).toBe('en');
    expect(loaded.timer.workMinutes).toBe(30);
    expect(loaded.timer.autoStartNext).toBe(true);
    expect(loaded.timer.shortBreakMinutes).toBe(5);
    expect(readVersion(s)).toBe(1);
  });

  it('is idempotent', async () => {
    const s = store();
    s.set(KEYS.settings, v0);
    const first = await createSettingsRepository(s).load();
    const second = await createSettingsRepository(s).load();
    expect(second).toEqual(first);
  });

  it('drops corrupt v0 data', async () => {
    const s = store();
    s.set(KEYS.settings, 'garbage');
    expect(await createSettingsRepository(s).load()).toEqual(defaultSettings());
  });
});

describe('unavailable storage', () => {
  it('falls back to memory when storage access throws', async () => {
    const s = createWebStore(() => {
      throw new Error('SecurityError');
    });
    expect(s.persistent).toBe(false);
    const repo = createSettingsRepository(s);
    await repo.update({ theme: 'light' });
    expect((await repo.load()).theme).toBe('light');
  });

  it('falls back to memory when storage is missing or writes fail', () => {
    expect(createWebStore(() => undefined).persistent).toBe(false);
    const full = new FakeStorage();
    full.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(createWebStore(() => full).persistent).toBe(false);
  });

  it('reports failed writes without throwing', () => {
    const fs = new FakeStorage();
    const s = createWebStore(() => fs);
    expect(s.persistent).toBe(true);
    fs.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(s.set('a', 'b')).toBe(false);
  });
});
