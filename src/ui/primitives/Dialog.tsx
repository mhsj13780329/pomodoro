'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  /** Called on Esc or backdrop click. The parent decides how to close. */
  onClose: () => void;
  label: string;
  children: ReactNode;
}

// Native <dialog> with showModal(): focus is trapped, Esc closes it, and focus
// returns to the element that opened it.
export function Dialog({ open, onClose, label, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,24rem)] rounded-card border border-border bg-surface p-6 text-fg shadow-xl backdrop:bg-black/50"
    >
      {open ? children : null}
    </dialog>
  );
}
