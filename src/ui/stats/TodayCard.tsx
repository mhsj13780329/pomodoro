'use client';

import { useGoal } from '@/application/providers/GoalProvider';
import { useT } from '@/application/providers/LocaleProvider';
import { useToday } from '@/application/stats/TodayProvider';
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from '@/domain/goals';
import { goalProgress } from '@/domain/stats';
import { MinusIcon, PlusIcon } from '../shell/icons';

const stepper =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-fg hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50';

export function TodayCard() {
  const { t, formatNumber, formatDuration } = useT();
  const { today } = useToday();
  const { goal, setDailyPomodoros } = useGoal();
  if (!today) return null;

  const progress = goalProgress(today.pomodoros, goal.dailyPomodoros);
  const isEmpty = today.pomodoros === 0 && today.completedTasks === 0;
  const progressText = t('today.goal.progress', {
    done: formatNumber(progress.completed),
    goal: formatNumber(progress.goal),
  });

  return (
    <section aria-labelledby="today-heading" className="w-full max-w-md rounded-card border border-border bg-surface p-4">
      <h2 id="today-heading" className="text-body font-semibold text-fg">
        {t('today.title')}
      </h2>

      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-caption text-muted">{t('today.goal.label')}</span>
            <span className="text-body font-medium text-fg">{progressText}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t('today.goal.label')}
            aria-valuemin={0}
            aria-valuemax={progress.goal}
            aria-valuenow={Math.min(progress.completed, progress.goal)}
            aria-valuetext={progressText}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-accent-soft"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
          {progress.reached ? <p className="mt-1 text-caption font-medium text-fg">{t('today.goal.reached')}</p> : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={stepper}
            aria-label={t('today.goal.decrease')}
            disabled={goal.dailyPomodoros <= MIN_DAILY_GOAL}
            onClick={() => setDailyPomodoros(goal.dailyPomodoros - 1)}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className={stepper}
            aria-label={t('today.goal.increase')}
            disabled={goal.dailyPomodoros >= MAX_DAILY_GOAL}
            onClick={() => setDailyPomodoros(goal.dailyPomodoros + 1)}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="mt-4 text-caption text-muted">{t('today.empty')}</p>
      ) : (
        <dl className="mt-4 grid grid-cols-3 gap-2 text-start">
          <Stat label={t('today.pomodoros')} value={formatNumber(today.pomodoros)} />
          <Stat label={t('today.focusTime')} value={formatDuration(today.focusMs)} />
          <Stat label={t('today.completedTasks')} value={formatNumber(today.completedTasks)} />
        </dl>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="text-body font-medium text-fg">{value}</dd>
    </div>
  );
}
