'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { TimerSnapshot } from '@/domain/timer';

// Presentation only: everything shown is derived from the snapshot.
export function DigitalTimer({ snapshot }: { snapshot: TimerSnapshot | null }) {
  const { t, formatClock } = useT();
  if (!snapshot) {
    return (
      <div aria-hidden="true" className="text-display leading-none font-bold text-muted sm:text-[5rem]">
        <span dir="ltr">&nbsp;</span>
      </div>
    );
  }
  const time = formatClock(snapshot.remainingMs);
  return (
    <div
      role="timer"
      aria-label={t('timer.remaining', { time })}
      className="text-[3.5rem] leading-none font-bold tabular-nums sm:text-[5.5rem]"
    >
      <span dir="ltr" className="inline-block">
        {time}
      </span>
    </div>
  );
}
