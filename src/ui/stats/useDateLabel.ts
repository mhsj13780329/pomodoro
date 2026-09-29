'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useSettings } from '@/application/providers/SettingsProvider';
import { monthName, partsIn, weekdayName } from '@/domain/calendar';
import type { CalendarSystem } from '@/domain/settings';

function otherCalendar(primary: CalendarSystem): CalendarSystem {
  return primary === 'jalali' ? 'gregorian' : 'jalali';
}

/** Day labels in the primary calendar setting. Only labels change with the calendar, never totals. */
export function useDateLabel() {
  const { t, locale, formatNumber } = useT();
  const { settings } = useSettings();
  const calendar = settings.calendar.primary;
  const secondary = settings.calendar.showSecondary ? otherCalendar(calendar) : undefined;

  function short(date: string, system: CalendarSystem) {
    const parts = partsIn(date, system);
    return t('stats.dateShort', {
      day: formatNumber(parts.day),
      month: monthName(system, parts.month, locale, 'long'),
    });
  }

  return {
    /** For example "Monday 16 March", with an optional secondary date in parentheses. */
    full(date: string) {
      const parts = partsIn(date, calendar);
      const primary = t('stats.date', {
        weekday: weekdayName(date, calendar, locale, 'long'),
        day: formatNumber(parts.day),
        month: monthName(calendar, parts.month, locale, 'long'),
      });
      if (!secondary) return primary;
      return t('stats.dateWithSecondary', { date: primary, secondary: short(date, secondary) });
    },
    weekday(date: string) {
      return weekdayName(date, calendar, locale, 'short');
    },
    /** Formatted day-of-month in the secondary calendar, or null when the toggle is off. */
    secondaryDay(date: string) {
      if (!secondary) return null;
      return formatNumber(partsIn(date, secondary).day);
    },
  };
}
