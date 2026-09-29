'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const THRESHOLD = 6;
const ZONE = '[data-drop-zone]';

/** The drop zone under a viewport point, if any. */
function zoneAt(x: number, y: number): Element | null {
  return document.elementFromPoint(x, y)?.closest(ZONE) ?? null;
}

/**
 * Pointer-based drag (works with mouse, pen and touch, unlike native drag and drop).
 * Attach `onPointerDown` to a grip element with `touch-action: none`. Dropping over an
 * element marked `data-drop-zone` calls `onDrop`. Escape or pointercancel aborts.
 * The zone under the pointer gets `data-drop-over="true"` for styling.
 */
export function useTaskDrag(onDrop: () => void) {
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });
  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let over: Element | null = null;

    const setOver = (next: Element | null) => {
      if (next === over) return;
      over?.removeAttribute('data-drop-over');
      next?.setAttribute('data-drop-over', 'true');
      over = next;
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      document.body.style.userSelect = '';
      setOver(null);
      setGhost(null);
      cleanup.current = null;
    };
    const move = (ev: globalThis.PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        document.body.style.userSelect = 'none';
      }
      setGhost({ x: ev.clientX, y: ev.clientY });
      setOver(zoneAt(ev.clientX, ev.clientY));
    };
    const up = (ev: globalThis.PointerEvent) => {
      const hit = dragging && zoneAt(ev.clientX, ev.clientY) !== null;
      stop();
      if (hit) dropRef.current();
    };
    const cancel = () => stop();
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') stop();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    cleanup.current = stop;
  }, []);

  return { onPointerDown, ghost };
}
