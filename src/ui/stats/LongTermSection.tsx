'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { LongTermSummary } from '@/domain/stats';

export function LongTermSection({ summary }: { summary: LongTermSummary }) {
  const { t, formatNumber, formatDuration } = useT();
  const days = (n: number) => t('stats.longTerm.days', { n: formatNumber(n) });
  const { trend } = summary;
  const trendText =
    trend.direction === 'flat'
      ? t('stats.longTerm.trendFlat')
      : t(trend.direction === 'up' ? 'stats.longTerm.trendUp' : 'stats.longTerm.trendDown', {
          d: formatDuration(Math.abs(trend.deltaMs)),
        });

  return (
    <section aria-labelledby="stats-long" className="rounded-card border border-border bg-surface p-4">
      <h2 id="stats-long" className="text-body font-semibold">
        {t('stats.longTerm.title')}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        <Stat label={t('stats.longTerm.currentStreak')} value={days(summary.currentStreak)} />
        <Stat label={t('stats.longTerm.longestStreak')} value={days(summary.longestStreak)} />
        <Stat label={t('stats.longTerm.activeDays')} value={days(summary.activeDays)} />
        <Stat label={t('stats.longTerm.totalFocus')} value={formatDuration(summary.totalFocusMs)} />
        <Stat label={t('stats.longTerm.totalPomodoros')} value={formatNumber(summary.totalPomodoros)} />
        <Stat
          label={t('stats.longTerm.tasks')}
          value={t('stats.longTerm.tasksValue', {
            done: formatNumber(summary.tasks.completed),
            total: formatNumber(summary.tasks.total),
          })}
        />
        <Stat label={t('stats.longTerm.dailyAverage')} value={formatDuration(summary.dailyAverageMs)} />
        <Stat label={t('stats.longTerm.weeklyAverage')} value={formatDuration(summary.weeklyAverageMs)} />
        <Stat label={t('stats.longTerm.trend')} value={trendText} />
      </dl>
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
