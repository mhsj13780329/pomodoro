'use client';

import { useT } from '@/application/providers/LocaleProvider';
import { useSettings } from '@/application/providers/SettingsProvider';
import type { CalendarSystem, NumeralSystem, Visualization } from '@/domain/settings';
import { SegmentedControl } from '../primitives/SegmentedControl';

const numerals: NumeralSystem[] = ['persian', 'latin'];
const calendars: CalendarSystem[] = ['jalali', 'gregorian'];
const visualizations: Visualization[] = ['digital', 'analog'];

/** Numerals, calendar, and timer visualization. Temporary home until M16. */
export function DisplayControls() {
  const { settings, updateSettings } = useSettings();
  const { t } = useT();
  const { primary, showSecondary } = settings.calendar;

  return (
    <div className="flex max-w-xs flex-col gap-4">
      <SegmentedControl
        label={t('settings.visualization.label')}
        value={settings.visualization}
        onChange={(value) => updateSettings({ visualization: value })}
        options={visualizations.map((value) => ({ value, label: t(`settings.visualization.${value}`) }))}
      />
      <SegmentedControl
        label={t('settings.numerals.label')}
        value={settings.numerals}
        onChange={(value) => updateSettings({ numerals: value })}
        options={numerals.map((value) => ({ value, label: t(`settings.numerals.${value}`) }))}
      />
      <SegmentedControl
        label={t('settings.calendar.primary')}
        value={primary}
        onChange={(value) => updateSettings({ calendar: { primary: value } })}
        options={calendars.map((value) => ({ value, label: t(`settings.calendar.${value}`) }))}
      />
      <button
        type="button"
        aria-pressed={showSecondary}
        onClick={() => updateSettings({ calendar: { showSecondary: !showSecondary } })}
        className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2 text-start text-body font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <span>{t('settings.calendar.secondary')}</span>
        <span
          aria-hidden="true"
          className={`ms-auto flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${showSecondary ? 'bg-accent' : 'bg-border'}`}
        >
          <span
            className={`size-4 rounded-full bg-surface shadow transition-transform ${showSecondary ? 'ltr:translate-x-4 rtl:-translate-x-4' : ''}`}
          />
        </span>
      </button>
    </div>
  );
}
