'use client';

import { useSettings } from '@/application/providers/SettingsProvider';
import { useT } from '@/application/providers/LocaleProvider';
import type { Locale } from '@/i18n';

const locales: Locale[] = ['fa', 'en'];

// Temporary control until the full settings UI (M16).
export function LanguageSwitch() {
  const { updateSettings } = useSettings();
  const { locale, t } = useT();

  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1 rounded-control bg-surface-hover p-1">
      {locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => updateSettings({ language: code })}
            className={[
              'min-h-11 flex-1 rounded-control px-3 text-body font-medium transition-colors',
              active ? 'bg-accent text-surface' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {t(`language.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
