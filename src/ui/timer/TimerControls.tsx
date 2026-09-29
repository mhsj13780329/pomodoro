'use client';

import type { ReactNode } from 'react';
import { useT } from '@/application/providers/LocaleProvider';
import type { TimerSnapshot } from '@/domain/timer';
import { PauseIcon, PlayIcon, ResetIcon, SkipIcon } from '../shell/icons';

interface Props {
  snapshot: TimerSnapshot | null;
  restoredPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
}

const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-body font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${base} bg-accent text-accent-contrast hover:opacity-90 min-w-32`;
const secondary = `${base} border border-border bg-surface text-fg hover:bg-surface-hover`;

function Button({
  className,
  onClick,
  disabled,
  children,
}: {
  className: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function TimerControls({ snapshot, restoredPaused, onStart, onPause, onResume, onReset, onSkip }: Props) {
  const { t } = useT();
  const status = snapshot?.status ?? 'idle';
  const disabled = snapshot === null;

  let main: ReactNode;
  if (status === 'running') {
    main = (
      <Button className={primary} onClick={onPause}>
        <PauseIcon />
        {t('timer.controls.pause')}
      </Button>
    );
  } else if (status === 'paused') {
    main = (
      <Button className={`${primary} ${restoredPaused ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`} onClick={onResume}>
        <PlayIcon className="rtl:-scale-x-100" />
        {t('timer.controls.resume')}
      </Button>
    );
  } else {
    main = (
      <Button className={primary} onClick={onStart} disabled={disabled}>
        <PlayIcon className="rtl:-scale-x-100" />
        {t('timer.controls.start')}
      </Button>
    );
  }

  return (
    <div role="group" aria-label={t('timer.controls.label')} className="flex flex-wrap items-center justify-center gap-3">
      {main}
      <Button className={secondary} onClick={onReset} disabled={disabled || status === 'idle'}>
        <ResetIcon />
        {t('timer.controls.reset')}
      </Button>
      <Button className={secondary} onClick={onSkip} disabled={disabled}>
        <SkipIcon className="rtl:-scale-x-100" />
        {t('timer.controls.skip')}
      </Button>
    </div>
  );
}
