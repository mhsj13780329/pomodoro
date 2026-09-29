'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type MessageKey } from '@/i18n/messages';
import { SettingsIcon, StatsIcon, TimerIcon } from './icons';

const items: { href: string; label: MessageKey; icon: () => React.JSX.Element }[] = [
  { href: '/', label: 'nav.timer', icon: TimerIcon },
  { href: '/statistics', label: 'nav.statistics', icon: StatsIcon },
  { href: '/settings', label: 'nav.settings', icon: SettingsIcon },
];

export function NavLinks({ orientation }: { orientation: 'sidebar' | 'bar' }) {
  const pathname = usePathname();
  const isBar = orientation === 'bar';

  return (
    <ul className={isBar ? 'flex w-full items-stretch justify-around' : 'flex flex-col gap-1'}>
      {items.map(({ href, label, icon: IconComponent }) => {
        const active = pathname === href;
        return (
          <li key={href} className={isBar ? 'flex-1' : undefined}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-11 items-center gap-1 rounded-control px-3 py-2 text-caption font-medium transition-colors',
                isBar ? 'flex-col justify-center' : 'flex-row gap-3 text-body',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-surface-hover hover:text-fg',
              ].join(' ')}
            >
              <IconComponent />
              <span>{t(label)}</span>
              {active && <span className="h-0.5 w-4 rounded-full bg-accent" aria-hidden="true" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
