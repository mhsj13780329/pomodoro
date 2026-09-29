'use client';

import { useState } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import { useTimer } from '@/application/timer/TimerProvider';
import { DigitalTimer } from './DigitalTimer';
import { ResetDialog } from './ResetDialog';
import { SessionIndicator } from './SessionIndicator';
import { TimerControls } from './TimerControls';

export function TimerView() {
  const { t } = useT();
  const timer = useTimer();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col items-center justify-center gap-8 p-6 md:min-h-dvh md:p-10">
      <h1 className="sr-only">{t('page.timer.title')}</h1>
      <SessionIndicator snapshot={timer.snapshot} restoredPaused={timer.restoredPaused} />
      <DigitalTimer snapshot={timer.snapshot} />
      <TimerControls
        snapshot={timer.snapshot}
        restoredPaused={timer.restoredPaused}
        onStart={timer.start}
        onPause={timer.pause}
        onResume={timer.resume}
        onReset={() => setConfirmingReset(true)}
        onSkip={timer.skip}
      />
      <ResetDialog
        open={confirmingReset}
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          setConfirmingReset(false);
          timer.reset();
        }}
      />
    </main>
  );
}
