'use client';

import { useSyncExternalStore } from 'react';
import { useSettings } from '@/application/providers/SettingsProvider';
import { useT } from '@/application/providers/LocaleProvider';
import { MoonIcon } from './icons';

// The `dark` class on <html> is the source of truth (set before paint by the layout script).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains('dark');
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const { updateSettings } = useSettings();
  const { t } = useT();
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
      className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2 text-body font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg"
    >
      <MoonIcon />
      <span>{t('theme.toggle')}</span>
      <span
        aria-hidden="true"
        className={`ms-auto flex h-5 w-9 items-center rounded-full p-0.5 ${dark ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`size-4 rounded-full bg-surface shadow transition-transform ${dark ? 'ltr:translate-x-4 rtl:-translate-x-4' : ''}`}
        />
      </span>
    </button>
  );
}
