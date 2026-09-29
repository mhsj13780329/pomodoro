'use client';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Language code for options written in their own language (for example "English"). */
  lang?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Small exclusive choice. Each button reports `aria-pressed`; the group carries the label. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-control bg-surface-hover p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.lang}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              'min-h-11 flex-1 rounded-control px-3 text-body font-medium transition-colors',
              active ? 'bg-accent text-surface' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
