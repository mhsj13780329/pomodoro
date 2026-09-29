'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useStatsData } from '@/application/stats/useStatsData';
import { ActivityHeatmap } from './ActivityHeatmap';
import { LongTermSection } from './LongTermSection';
import { WeeklySection } from './WeeklySection';

export function StatisticsView() {
  const { t } = useT();
  const data = useStatsData();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-10">
      <h1 className="text-title font-bold">{t('page.statistics.title')}</h1>
      {data === null ? null : data.longTerm.isEmpty ? (
        <p className="rounded-card border border-border bg-surface p-4 text-muted">{t('stats.empty')}</p>
      ) : (
        <>
          <WeeklySection weekly={data.weekly} />
          <ActivityHeatmap grid={data.grid} />
          <LongTermSection summary={data.longTerm} />
        </>
      )}
    </main>
  );
}
