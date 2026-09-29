'use client';

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { writeLocaleCookie } from '@/data/local/localeCookie';
import { defaultSettings } from '@/domain/settings';
import { dirOf, formatClock, formatDuration, formatNumber, translate } from '@/i18n';
import type { Direction, Locale, MessageKey, Params } from '@/i18n';
import { useSettings } from './SettingsProvider';

interface LocaleContextValue {
  locale: Locale;
  dir: Direction;
  t: (key: MessageKey, params?: Params) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatClock: (ms: number) => string;
  formatDuration: (ms: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** `initialLocale` comes from the server cookie and is used until stored settings load. */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const { settings, ready } = useSettings();
  const locale = ready ? settings.language : initialLocale;
  const numerals = ready ? settings.numerals : defaultSettings(initialLocale).numerals;
  const dir = dirOf(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    if (ready) writeLocaleCookie(locale);
  }, [locale, dir, ready]);

  const t = useCallback((key: MessageKey, params?: Params) => translate(locale, key, params), [locale]);
  const format = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, { locale, numerals }, options),
    [locale, numerals],
  );
  const clock = useCallback((ms: number) => formatClock(ms, { locale, numerals }), [locale, numerals]);
  const duration = useCallback((ms: number) => formatDuration(ms, { locale, numerals }), [locale, numerals]);
  const value = useMemo(
    () => ({ locale, dir, t, formatNumber: format, formatClock: clock, formatDuration: duration }),
    [locale, dir, t, format, clock, duration],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useT must be used inside LocaleProvider');
  return ctx;
}
