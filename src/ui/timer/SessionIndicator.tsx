'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { TimerSnapshot } from '@/domain/timer';

// Session and state are always words, never color alone.
export function SessionIndicator({
  snapshot,
  restoredPaused,
}: {
  snapshot: TimerSnapshot | null;
  restoredPaused: boolean;
}) {
  const { t } = useT();
  if (!snapshot) return <div className="min-h-14" aria-hidden="true" />;
  const status = restoredPaused ? 'timer.status.restored' : (`timer.status.${snapshot.status}` as const);
  return (
    <div className="flex min-h-14 flex-col items-center gap-1 text-center">
      <p className="rounded-full bg-accent-soft px-4 py-1 text-body font-medium text-fg">
        {t(`timer.session.${snapshot.sessionType}`)}
      </p>
      <p
        role="status"
        className={`text-caption ${restoredPaused ? 'rounded-control border border-accent px-3 py-1 font-medium text-fg' : 'text-muted'}`}
      >
        {t(status)}
      </p>
    </div>
  );
}
