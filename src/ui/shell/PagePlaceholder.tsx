import { t, type MessageKey } from '@/i18n/messages';

export function PagePlaceholder({ title }: { title: MessageKey }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-6 md:p-10">
      <h1 className="text-title font-bold">{t(title)}</h1>
      <p className="text-muted">{t('page.placeholder')}</p>
    </main>
  );
}
