'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { WeeklySummary } from '@/domain/stats';
import { useDateLabel } from './useDateLabel';

export function WeeklySection({ weekly }: { weekly: WeeklySummary }) {
  const { t, formatNumber, formatDuration } = useT();
  const label = useDateLabel();
  const max = Math.max(1, ...weekly.days.map((d) => d.pomodoros));

  return (
    <section aria-labelledby="stats-weekly" className="rounded-card border border-border bg-surface p-4">
      <h2 id="stats-weekly" className="text-body font-semibold">
        {t('stats.weekly.title')}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <dt className="text-caption text-muted">{t('stats.weekly.pomodoros')}</dt>
          <dd className="text-body font-medium">{formatNumber(weekly.totalPomodoros)}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">{t('stats.weekly.focusTime')}</dt>
          <dd className="text-body font-medium">{formatDuration(weekly.totalFocusMs)}</dd>
        </div>
      </dl>

      {/* Visual bars are decorative; the table below carries the same data for assistive tech. */}
      <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {weekly.days.map((d) => (
          <div key={d.date} className="flex min-w-0 flex-col items-center gap-1">
            <span className="text-caption font-medium">{formatNumber(d.pomodoros)}</span>
            <div className="flex h-32 w-full items-end rounded-control bg-accent-soft">
              <div
                className="w-full rounded-control border border-accent bg-accent"
                style={{ height: d.pomodoros === 0 ? 0 : `${Math.max(6, (d.pomodoros / max) * 100)}%` }}
              />
            </div>
            <span className="max-w-full truncate text-caption text-muted">{label.weekday(d.date)}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{t('stats.weekly.chartLabel')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('stats.table.day')}</th>
            <th scope="col">{t('stats.table.pomodoros')}</th>
            <th scope="col">{t('stats.table.focusTime')}</th>
          </tr>
        </thead>
        <tbody>
          {weekly.days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{label.full(d.date)}</th>
              <td>{formatNumber(d.pomodoros)}</td>
              <td>{formatDuration(d.focusMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
