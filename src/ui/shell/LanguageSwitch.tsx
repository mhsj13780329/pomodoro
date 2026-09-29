'use client';

import { useSettings } from '@/application/providers/SettingsProvider';
import { useT } from '@/application/providers/LocaleProvider';
import type { Locale } from '@/i18n';
import { SegmentedControl } from '../primitives/SegmentedControl';

const locales: Locale[] = ['fa', 'en'];

// Temporary control until the full settings UI (M16).
export function LanguageSwitch() {
  const { updateSettings } = useSettings();
  const { locale, t } = useT();

  return (
    <SegmentedControl
      label={t('language.label')}
      value={locale}
      onChange={(language) => updateSettings({ language })}
      options={locales.map((code) => ({ value: code, lang: code, label: t(`language.${code}`) }))}
    />
  );
}
