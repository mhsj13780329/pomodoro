'use client';

import type { ReactNode } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import { LanguageSwitch } from './LanguageSwitch';
import { NavLinks } from './NavLinks';
import { ThemeToggle } from './ThemeToggle';
import { ToastHost } from './ToastHost';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-e border-border bg-surface p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <p className="px-3 pt-2 text-title font-bold text-accent">{t('app.name')}</p>
        <nav aria-label={t('nav.label')}>
          <NavLinks orientation="sidebar" />
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-x-clip pb-24 md:pb-0">{children}</div>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <NavLinks orientation="bar" />
      </nav>
      <ToastHost />
    </div>
  );
}
