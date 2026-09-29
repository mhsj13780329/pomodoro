"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useT } from "@/application/providers/LocaleProvider";
import { ChevronIcon } from "../shell/icons";
import { TaskPanel } from "./TaskPanel";

const MOBILE_QUERY = "(max-width: 767px)";
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Edge tab plus a side drawer at the inline-end edge (right in LTR, left in RTL).
 * Desktop: non-modal, so tasks can be dragged to the drop zone above the timer.
 * Mobile: modal (backdrop, focus kept inside, Esc closes).
 */
export function TasksDrawer() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const id = useId();
  const tabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (wasOpen.current) tabRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" || !mobile) return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {!open ? (
        <div className="fixed end-0 top-1/2 z-20 -translate-y-1/2">
          <button
            ref={tabRef}
            type="button"
            aria-expanded={false}
            aria-controls={id}
            aria-label={t("tasks.panel.expand")}
            onClick={() => setOpen(true)}
            className="flex h-28 w-8 translate-x-2 items-center justify-center rounded-s-control border border-e-0 border-border bg-surface text-muted shadow-md transition-[transform,background-color,color] duration-200 ease-out hover:translate-x-0 hover:bg-accent-soft hover:text-accent focus-visible:translate-x-0 focus-visible:bg-accent-soft focus-visible:text-accent active:bg-accent-soft active:text-accent motion-reduce:transition-none rtl:-translate-x-2 rtl:hover:translate-x-0 rtl:focus-visible:translate-x-0"
          >
            {/* Points toward the screen center: left in LTR, right in RTL. */}
            <ChevronIcon className="-scale-x-100 rtl:scale-x-100" />
          </button>
        </div>
      ) : null}

      {mobile ? (
        <div
          aria-hidden="true"
          onClick={close}
          className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      ) : null}

      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal={mobile}
        aria-label={t("tasks.title")}
        inert={!open}
        onKeyDown={onKeyDown}
        className={`fixed inset-y-0 end-0 z-40 flex w-[88vw] max-w-md flex-col gap-3 border-s border-border bg-surface p-4 transition-transform duration-200 ease-out motion-reduce:transition-none md:w-80 md:max-w-none ${
          open ? "translate-x-0 shadow-xl" : "translate-x-full rtl:-translate-x-full"
        }`}>
        {open ? (
          <button
            ref={tabRef}
            type="button"
            aria-expanded={true}
            aria-controls={id}
            aria-label={t("tasks.panel.close")}
            onClick={close}
            className="absolute start-0 top-1/2 z-10 flex h-28 w-8 -translate-x-full -translate-y-1/2 items-center justify-center rounded-e-control border border-s-0 border-border bg-surface text-muted shadow-md transition-[background-color,color] duration-200 ease-out hover:bg-accent-soft hover:text-accent focus-visible:bg-accent-soft focus-visible:text-accent active:bg-accent-soft active:text-accent motion-reduce:transition-none rtl:translate-x-full rtl:rounded-e-none rtl:rounded-s-control rtl:border-s rtl:border-e-0"
          >
            {/* Points toward the screen edge: right in LTR, left in RTL. */}
            <ChevronIcon className="rtl:-scale-x-100" />
          </button>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-title font-bold">{t("tasks.title")}</h2>
        </div>
        <div className="-me-2 min-h-0 flex-1 overflow-y-auto pe-2">
          <TaskPanel />
        </div>
      </div>
    </>
  );
}
