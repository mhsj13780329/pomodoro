'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { Dialog } from '../primitives/Dialog';

export function ResetDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onClose={onCancel} label={t('timer.controls.reset')}>
      <p className="text-body">{t('timer.reset.message')}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="min-h-11 rounded-control border border-border bg-surface px-4 py-2 font-medium hover:bg-surface-hover"
        >
          {t('timer.reset.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-control bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90"
        >
          {t('timer.reset.confirm')}
        </button>
      </div>
    </Dialog>
  );
}
