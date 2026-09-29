'use client';

import { useState } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import { useTimer } from '@/application/timer/TimerProvider';
import { TodayCard } from '../stats/TodayCard';
import { SelectedTaskZone } from '../tasks/SelectedTaskZone';
import { TasksDrawer } from '../tasks/TasksDrawer';
import { DigitalTimer } from './DigitalTimer';
import { ResetDialog } from './ResetDialog';
import { SessionIndicator } from './SessionIndicator';
import { TimerControls } from './TimerControls';

export function TimerView() {
  const { t } = useT();
  const timer = useTimer();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <>
      <main className="mx-auto flex min-h-[70dvh] w-full min-w-0 max-w-3xl flex-1 flex-col items-center justify-center gap-8 p-6 md:min-h-dvh md:p-10">
        <h1 className="sr-only">{t('page.timer.title')}</h1>
        <div className="hidden w-full max-w-md md:block">
          <SelectedTaskZone centered />
        </div>
        <div className="w-full max-w-md md:hidden">
          <SelectedTaskZone readOnly centered />
        </div>
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
        <TodayCard />
        <ResetDialog
          open={confirmingReset}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            timer.reset();
          }}
        />
      </main>
      <TasksDrawer />
    </>
  );
}
