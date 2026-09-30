'use client';

import { useT } from '@/application/providers/LocaleProvider';
import type { TimerSnapshot } from '@/domain/timer';
import { analogHands } from './analogHands';

const LABELS = [
  { value: 12, x: 50, y: 18 },
  { value: 3, x: 84, y: 53.5 },
  { value: 6, x: 50, y: 89 },
  { value: 9, x: 16, y: 53.5 },
] as const;

function Face({ numerals }: { numerals: (n: number) => string }) {
  return (
    <>
      <circle cx="50" cy="50" r="46" fill="none" className="stroke-border" strokeWidth="1.5" />
      {LABELS.map(({ value, x, y }) => (
        <text
          key={value}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted text-[9px] font-medium"
        >
          {numerals(value)}
        </text>
      ))}
    </>
  );
}

function Hand({
  deg,
  length,
  width,
  className,
}: {
  deg: number;
  length: number;
  width: number;
  className: string;
}) {
  return (
    <g
      className="motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none"
      style={{ transform: `rotate(${deg}deg)`, transformOrigin: '50px 50px', transformBox: 'view-box' }}
    >
      <rect x={50 - width / 2} y={50 - length} width={width} height={length} rx={width / 2} className={className} />
    </g>
  );
}

export function AnalogTimer({ snapshot }: { snapshot: TimerSnapshot | null }) {
  const { t, formatClock, formatNumber } = useT();
  const numerals = (n: number) => formatNumber(n, { useGrouping: false });
  if (!snapshot) {
    return (
      <div aria-hidden="true" className="size-44 sm:size-56" dir="ltr">
        <svg viewBox="0 0 100 100" className="size-full">
          <Face numerals={numerals} />
        </svg>
      </div>
    );
  }
  const time = formatClock(snapshot.remainingMs);
  const { hourDeg, minuteDeg, secondDeg } = analogHands(snapshot.remainingMs);
  return (
    <div role="timer" aria-label={t('timer.remaining', { time })} className="size-44 sm:size-56" dir="ltr">
      <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden="true">
        <Face numerals={numerals} />
        <Hand deg={hourDeg} length={22} width={3.2} className="fill-fg" />
        <Hand deg={minuteDeg} length={32} width={2.2} className="fill-fg" />
        <Hand deg={secondDeg} length={36} width={1.2} className="fill-accent" />
        <circle cx="50" cy="50" r="2.4" className="fill-accent" />
      </svg>
    </div>
  );
}
