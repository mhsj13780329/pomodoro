'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { MessageKey } from '@/i18n';
import { DisplayControls } from '../settings/DisplayControls';
import { LanguageSwitch } from './LanguageSwitch';

export function PagePlaceholder({
  title,
  withLanguageSwitch = false,
  withDisplayControls = false,
}: {
  title: MessageKey;
  withLanguageSwitch?: boolean;
  withDisplayControls?: boolean;
}) {
  const { t } = useT();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-6 md:p-10">
      <h1 className="text-title font-bold">{t(title)}</h1>
      <p className="text-muted">{t('page.placeholder')}</p>
      {withLanguageSwitch ? (
        <div className="mt-4 max-w-xs md:hidden">
          <LanguageSwitch />
        </div>
      ) : null}
      {withDisplayControls ? (
        <div className="mt-6">
          <DisplayControls />
        </div>
      ) : null}
    </main>
  );
}
