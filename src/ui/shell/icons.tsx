import type { ReactNode } from 'react';

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function TimerIcon() {
  return (
    <Icon>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9.5 2.5h5" />
    </Icon>
  );
}

export function StatsIcon() {
  return (
    <Icon>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Icon>
  );
}

export function MoonIcon() {
  return (
    <Icon>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Icon>
  );
}

export function PlayIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 4.5v15l12-7.5z" />
    </Icon>
  );
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8 5v14M16 5v14" />
    </Icon>
  );
}

export function ResetIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" />
    </Icon>
  );
}

// Directional: callers mirror it in RTL.
export function SkipIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 5v14l10-7zM19 5v14" />
    </Icon>
  );
}
