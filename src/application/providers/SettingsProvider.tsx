'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createLocalStore } from '@/data/local/localStore';
import { createSettingsRepository } from '@/data/local/settingsRepository';
import { writeThemeCookie } from '@/data/local/themeCookie';
import type { SettingsRepository } from '@/domain/repositories';
import { defaultSettings } from '@/domain/settings';
import type { SettingsPatch, ThemeChoice, UserSettings } from '@/domain/settings';

interface SettingsContextValue {
  settings: UserSettings;
  /** False until stored settings have been loaded on the client. */
  ready: boolean;
  updateSettings: (patch: SettingsPatch) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyTheme(theme: ThemeChoice) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => defaultSettings());
  const [ready, setReady] = useState(false);
  const repoRef = useRef<SettingsRepository | null>(null);

  // Storage is only touched on the client, after hydration.
  useEffect(() => {
    let cancelled = false;
    const repo = createSettingsRepository(createLocalStore());
    repoRef.current = repo;
    void repo.load().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(settings.theme);
    writeThemeCookie(settings.theme);
    if (settings.theme !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [ready, settings.theme]);

  const updateSettings = useCallback((patch: SettingsPatch) => {
    const repo = repoRef.current;
    if (!repo) return;
    void repo.update(patch).then(setSettings);
  }, []);

  const value = useMemo(() => ({ settings, ready, updateSettings }), [settings, ready, updateSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
