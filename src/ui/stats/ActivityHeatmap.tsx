'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { ActivityCell } from '@/domain/stats';
import { useDateLabel } from './useDateLabel';

// Shade plus the number inside the cell, so the level is never color-only.
const LEVEL_CLASS: Record<ActivityCell['level'], string> = {
  0: 'bg-surface-hover text-muted',
  1: 'bg-accent/25 text-fg',
  2: 'bg-accent/50 text-fg',
  3: 'bg-accent/75 text-accent-contrast',
  4: 'bg-accent text-accent-contrast',
};

/** Weeks are columns (oldest first, following the reading direction). Older weeks drop out on small screens. */
export function ActivityHeatmap({ grid }: { grid: ActivityCell[][] }) {
  const { t, formatNumber } = useT();
  const label = useDateLabel();
  const hiddenOnMobile = Math.floor(grid.length / 3);

  return (
    <section aria-labelledby="stats-activity" className="rounded-card border border-border bg-surface p-4">
      <h2 id="stats-activity" className="text-body font-semibold">
        {t('stats.activity.title')}
      </h2>
      <p className="mt-1 text-caption text-muted">
        <span className="sm:hidden">{t('stats.activity.description', { weeks: formatNumber(grid.length - hiddenOnMobile) })}</span>
        <span className="hidden sm:inline">{t('stats.activity.description', { weeks: formatNumber(grid.length) })}</span>
      </p>
      <div role="group" aria-label={t('stats.activity.groupLabel')} className="mt-3 grid auto-cols-fr grid-flow-col gap-1">
        {grid.map((week, w) => (
          <div key={week[0].date} className={`${w < hiddenOnMobile ? 'hidden sm:grid' : 'grid'} grid-rows-7 gap-1`}>
            {week.map((cell) => (
              <div
                key={cell.date}
                role="img"
                aria-label={
                  cell.isFuture
                    ? t('stats.activity.cellFuture', { date: label.full(cell.date) })
                    : t('stats.activity.cell', { date: label.full(cell.date), count: formatNumber(cell.pomodoros) })
                }
                className={`flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-[4px] text-[0.625rem] font-medium leading-none ${
                  cell.isFuture ? 'border border-dashed border-border' : LEVEL_CLASS[cell.level]
                }`}
              >
                {cell.pomodoros > 0 ? formatNumber(cell.pomodoros) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
