'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useToast } from '@/application/providers/ToastProvider';

// The live region stays mounted so screen readers announce the message when it appears.
export function ToastHost() {
  const { t } = useT();
  const { message, dismiss } = useToast();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 md:bottom-6"
    >
      {message ? (
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-control border border-border bg-surface px-4 py-3 shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]">
          <p className="text-body">{message}</p>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 shrink-0 rounded-control px-3 font-medium text-accent hover:bg-surface-hover"
          >
            {t('toast.dismiss')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
