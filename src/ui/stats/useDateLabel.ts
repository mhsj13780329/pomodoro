'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useSettings } from '@/application/providers/SettingsProvider';
import { monthName, partsIn, weekdayName } from '@/domain/calendar';

/** Day labels in the primary calendar setting. Only labels change with the calendar, never totals. */
export function useDateLabel() {
  const { t, locale, formatNumber } = useT();
  const { settings } = useSettings();
  const calendar = settings.calendar.primary;
  return {
    /** For example "Monday 16 March". */
    full(date: string) {
      const parts = partsIn(date, calendar);
      return t('stats.date', {
        weekday: weekdayName(date, calendar, locale, 'long'),
        day: formatNumber(parts.day),
        month: monthName(calendar, parts.month, locale, 'long'),
      });
    },
    weekday(date: string) {
      return weekdayName(date, calendar, locale, 'short');
    },
  };
}
