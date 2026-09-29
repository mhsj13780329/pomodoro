# Milestones

Status: Accepted. This is the build order. Where it differs from PRD section 31, this file governs.

The PRD's section 31 defines nine coarse milestones. This plan splits them into ordered, session-sized steps. `PRD §n` refers to `docs/PRD.md`.

Rules for every milestone (from AGENTS.md and the PRD):

- The app runs (`pnpm dev`) and `pnpm build` succeeds at the end.
- Domain logic gets tests in the same milestone.
- No feature outside the PRD is added.
- Every milestone ends with `pnpm lint && pnpm typecheck && pnpm test && pnpm build` passing.

Deviations from the PRD's ordering, and why:

- Persistence and a minimal localization core come before the timer, because AGENTS.md forbids hardcoded strings from the first component (PRD M5 puts localization fifth).
- Settings storage is built early (M2) so theme, language, and timer durations persist from the start. The full Settings UI stays late (M17), as in the PRD.
- The PRD lists analog visualization (PRD §7, §33 item 26) but assigns it to no milestone. It is added as M14.
- Timer persistence (PRD §5) and task edit/delete/reopen (PRD §8) are in scope from the start of the timer and task milestones. `localDateOf` (a small piece of `domain/calendar`) is needed as early as M6; the rest of the calendar domain comes in M9.

---

## M0. Tooling and scaffold

Goal: an empty but correct project with the quality gates in place.

Scope: Next.js (App Router, TypeScript strict, Tailwind), pnpm, Vitest, ESLint with the boundary rules from `docs/ARCHITECTURE.md` section 3, `tsconfig.domain.json`, folder skeleton, `package.json` scripts (`dev`, `build`, `lint`, `typecheck`, `test`).

Acceptance criteria:

- PRD §2: Next.js App Router, React, TypeScript, Tailwind CSS in use; dependency list matches DECISIONS.md.
- `pnpm dev` serves a placeholder page; `pnpm build` succeeds.
- A deliberately bad import (React in `src/domain`) fails lint or typecheck, verified once and removed.
- One trivial domain test runs under `pnpm test`.

## M1. App shell, design tokens, theme

Scope: design tokens (spacing, type scale, blue accent), sidebar/icon navigation, routes `/`, `/statistics`, `/settings` as placeholders, light/dark theme via CSS variables and class, Vazirmatn font.

Acceptance criteria:

- PRD §3: minimal sidebar/icon navigation, no top navbar, no `/tasks` route.
- PRD §17-18: light and dark themes, blue accent, theme system able to take more themes later; `prefers-reduced-motion` respected.
- PRD §22: keyboard navigable nav with visible focus and accessible names.
- PRD §23: no horizontal scroll at mobile, tablet, desktop widths; mobile nav intentionally designed (for example bottom bar).
- Font fallback stack in place (DECISIONS D6).

## M2. Persistence layer and settings state

Scope: repository interfaces in `domain/repositories` (settings, tasks, sessions, timer state, goal), `data/local` implementation (shared data) with schema envelope, migration runner and operation-level read-modify-write, `data/session` for per-tab state, `data/memory` fallback, `UserSettings` type with defaults and normalization, `SettingsProvider`. Theme choice is wired to it. Only the settings repository is implemented end to end here; the others get their implementation in the milestone that uses them.

Acceptance criteria:

- PRD §19: no component touches `localStorage`; lint rule enforces it.
- PRD §20: `UserSettings` covers timer, theme, language, numerals, calendar, notifications, audio, visualization, auto-start.
- Tests: defaults on empty storage, corrupt JSON fallback, a v0 to v1 migration fixture, unavailable-storage fallback.
- Theme persists across reload.

## M3. Localization core

Scope: `i18n` dictionaries (`en`, `fa`) with typed keys, `t()`, locale cookie, `<html lang dir>` from the server, language switch (temporary control until M17), numeral formatter (Persian/Latin) using `Intl`, shell strings translated.

Acceptance criteria:

- PRD §11: Persian (RTL) and English (LTR); no hardcoded strings in shell components (lint rule enforces JSX text).
- PRD §12: numerals are independent of language.
- PRD §11: layout uses logical properties; sidebar and other directional elements mirror correctly; reviewed per component.
- Tests: key parity, numeral formatting in both systems, `dir` selection.
- Language persists across reload with no visible direction flash.

## M4. Timer engine (domain only)

Scope: `domain/timer` per `docs/ARCHITECTURE.md` section 4 (including serializable state and `restore`), `domain/sessions` cycle-progress derivation, plus `Clock` and fake clock. No UI, no storage.

Acceptance criteria:

- PRD §5: defaults 25/5/15, long break after 4; start, pause, resume, reset, skip; skipped work not counted; skipping a break has no stats impact.
- PRD §6: timestamp-based; no decrementing counter; correct after a simulated multi-hour background gap and after simulated sleep.
- PRD §7: engine has no React, DOM, storage, audio, or stats imports (enforced by typecheck/lint).
- PRD §29: emits domain events.
- PRD §30 timer tests: start, pause, resume, reset, skip, completion, auto transition, long break at the correct count, background timing.
- PRD §5 restore: tests for restoring idle and paused state; a running state restored as paused with `remaining = endsAt - savedAt` (clamped to 0..planned); the zero-remaining edge case (completes once, `completedAt` is the planned end, flagged `restored`, not auto-started). No clock is needed for restore.
- PRD §5 cycle counter: a pure function derives the counter from today's completed work sessions (`count mod sessionsBeforeLongBreak`); tested including a changed `sessionsBeforeLongBreak` and a day boundary.

## M5. Timer UI (digital) and controls

Scope: `useTimer` (via `useSyncExternalStore`), driver (interval, timeout, visibility handling), digital visualization, Start/Pause/Resume/Reset/Skip controls, reset confirmation dialog, session type indicator, timer durations from settings defaults, `TimerStateRepository` (session-storage implementation) with save on every state change and on `pagehide`/hidden (no periodic saving), and restore on boot. The selected task ID also lives in session storage. The cycle counter input is an injected function that returns 0 until real sessions exist (wired in M6).

Acceptance criteria:

- PRD §5: all five controls work; Reset asks for confirmation with the specified message (localized); next session begins automatically; auto-start honored.
- PRD §6: hiding the tab for several minutes, then returning, shows the correct remaining time.
- PRD §7: visualization receives only a timer snapshot; no logic in it.
- PRD §22: controls are labeled buttons, the dialog is accessible (focus trap, Esc, focus return); state not conveyed by color alone.
- Timer digits do not jitter (DECISIONS D6 verification).
- PRD §5: after a reload of the tab (or the browser's reopen-closed-tab), a timer that was running or paused comes back **paused** with the same remaining time (as of the last save), and an idle timer comes back idle on the same session type. Time spent closed does not count.
- PRD §5, §22: the restored paused state is visibly indicated (label and control state, not color alone), and the timer never resumes by itself.
- PRD §5: simulated crash (no `pagehide`) restores as of the last state change.
- PRD §5: a second tab opened while the first is running starts with a fresh idle timer; starting, pausing or resetting in either tab never changes the other (manual two-tab check plus a unit test with two engines and two stores).
- PRD §5: if the saved remaining time is zero, the session completes on restore with no sound or notification and no auto-start.
- Corrupt or unknown persisted timer state falls back to idle without an error shown to the user.

## M6. Completion pipeline: sessions, toast, sound, notification

Scope: `PomodoroSession` type, `SessionRepository`, minimal `localDateOf` in `domain/calendar`, event subscriber, toast, completion sound, notification adapter with graceful permission flow, and wiring the derived cycle counter (from today's sessions) into the timer on boot.

Acceptance criteria:

- PRD §5 (behavior list): on work completion, a session is recorded, a non-blocking toast appears, the sound plays if enabled, a notification fires if enabled and permitted, and the next session starts (or is ready).
- PRD §15: permission requested only after a user gesture; never on load; not re-requested after denial; app works when denied or unsupported (including a thrown error on Android).
- PRD §20-21: each session stores local date computed in the user's timezone, planned duration, completion timestamp.
- Tests: subscriber records exactly one session per work completion, none for skip/reset/breaks.
- PRD §5, §21: sessions completed in two tabs are both kept (repository writes are read-modify-write against current storage; test with two repository instances over one store).
- PRD §5: a session completed via the zero-remaining restore edge case is recorded once ; no sound or notification for it.
- PRD §5: after a reload mid-day, the next long break still comes after the correct number of work sessions.
- Dev-only way to shorten durations for manual testing (not user-facing), or a documented way to override via settings.

## M7. Tasks: domain, storage, desktop panel

Scope: `Task` type and rules, `TaskRepository`, `TasksProvider`, task panel integrated into the dashboard: add, list, edit title, delete, select, switch, complete and reopen; collapsible via handle; empty state.

Acceptance criteria:

- PRD §8: add, view, edit, delete, select, switch, complete and mark incomplete; each of add/edit/delete/status-change works for both incomplete and completed tasks; no priorities, deadlines, projects, subtasks.
- PRD §8 rules: only incomplete tasks are selectable; completing or deleting the selected task clears the selection; deleting a task keeps its Pomodoro records.
- Task domain tests: create, edit (title validation, trims, non-empty), delete, complete sets the timestamp, reopen clears it, selection rules.
- Edit and delete controls are keyboard reachable with accessible names that include the task title.
- PRD §3: panel integrated into the dashboard, collapsible with a small arrow/handle that mirrors in RTL.
- PRD §19: tasks persist across reload; the selected task is per tab and persists across reload of that tab (session storage).
- PRD §8: a task added in one tab is not overwritten or lost by writes from another tab.
- PRD §24: empty state text present and localized.
- Completed Pomodoro is associated with the selected task at completion time (see `DECISIONS.md`, resolved product ambiguities).

## M8. Tasks: mobile drawer

Scope: mobile drawer/bottom sheet for the task panel; one-handed timer use.

Acceptance criteria:

- PRD §3 and §23: on mobile the desktop panel layout is not forced; drawer/bottom sheet opens and closes; timer controls remain reachable one-handed.
- PRD §22: drawer is keyboard and screen-reader accessible (focus management, Esc, labeled trigger).
- Touch targets are comfortable (at least 44 px).
- Selected task is visible on the timer view without opening the drawer.

## M9. Calendar domain (Jalali/Gregorian)

Scope: `domain/calendar` only (plus tests). No UI.

Acceptance criteria:

- PRD §13: Gregorian and Jalali conversion through a library (`jalaali-js`), not hand-rolled; month/year boundaries, week start, local-midnight handling.
- PRD §30 calendar tests: Jalali and Gregorian conversion, calendar boundaries, secondary calendar formatting, local date handling.
- Tests use explicit time zones, include DST boundaries, and include Esfand/Farvardin and leap years.
- Cross-check against `Intl` persian calendar over a range of years (DECISIONS D3 risk).

## M10. Statistics domain

Scope: `domain/stats` pure functions and tests. No UI.

Acceptance criteria:

- PRD §9: daily (Pomodoros, focus time, completed tasks, goal progress), weekly (focus minutes, Pomodoros per day, activity grid data), long-term (total focus, daily and weekly averages, current and longest streak, trends, task completion, historical activity), all derived from session records.
- PRD §9, §21: local-date grouping only; streak rule documented in `docs/ARCHITECTURE.md` and code; tested around midnight and DST.
- PRD §10: daily goal progress function.
- PRD §30 statistics tests: completed count, focus duration, daily and weekly grouping, streaks, goals.

## M11. Daily goal and today statistics on the dashboard

Scope: `GoalRepository` and goal setting, dashboard goal progress (for example `3 / 6 Pomodoros`), today card.

Acceptance criteria:

- PRD §10: simple daily goal; dashboard shows progress; keep goals simple.
- PRD §9 Today: completed Pomodoros, focus time, completed tasks, goal progress.
- Completing a Pomodoro updates the numbers without a reload.
- PRD §24: no-statistics empty state.
- Numbers are formatted via the numeral setting.

## M12. Statistics page

Scope: `/statistics` UI: weekly view with activity/heatmap, long-term view, streaks, task completion; lightweight chart implemented in plain SVG/CSS (no chart library unless justified here first).

Acceptance criteria:

- PRD §9: weekly and long-term items listed in the PRD are present; current and longest streak shown.
- PRD §22: charts have text alternatives (table or labels); no color-only encoding.
- PRD §23: layout works on mobile without horizontal scroll (heatmap adapts).
- PRD §24: empty state.
- A dependency, if added, is recorded in DECISIONS.md with justification.

## M13. Calendar and numerals in the UI

Scope: calendar setting (Jalali/Gregorian, default from language), secondary calendar toggle, apply to statistics labels and heatmap cells, numerals applied throughout.

Acceptance criteria:

- PRD §13: defaults (fa: Jalali, en: Gregorian), manual override independent of language, optional secondary calendar shown smaller and subtler in the day cell.
- PRD §12: numeral setting applied consistently everywhere numbers appear (timer, stats, goal, dates, settings).
- PRD §11: all existing screens reviewed in both directions.
- Regression: stats values unchanged when switching calendars (grouping is calendar-independent).

## M14. Analog timer visualization

Scope: analog clock face and hands visualization; switch between digital and analog.

Acceptance criteria:

- PRD §7 and §33 item 26: analog visualization works from the same timer snapshot; no engine changes.
- PRD §22: accessible name and text remaining time available to screen readers; not visual-only.
- PRD §17: subtle motion only; respects `prefers-reduced-motion` (no continuous sweeping animation when reduced).
- The choice persists in settings.

## M15. Focus audio

Scope: `AudioProvider` abstraction, an initial set of sound assets, play/pause, volume, enabled preference, controls, empty state.

Acceptance criteria:

- PRD §14: choose sound, play, pause, volume, enabled/disabled preference; provider abstraction; not a music player; no external integrations.
- PRD §14: autoplay restrictions handled (starts only from a user gesture; a failed play shows a helpful message, not an error).
- PRD §24: "Choose a focus sound." empty state.
- Assets are properly licensed and their licenses recorded in the repo.
- Audio does not couple to the timer engine.

## M16. Settings section

Scope: full `/settings` UI, replacing the temporary controls.

Acceptance criteria:

- PRD §16: all listed settings present (Timer, Appearance, Language, Numerals, Calendar, Notifications, Focus audio) and persisted.
- Duration changes apply to the next session and never alter a running one; input validation with helpful messages.
- PRD §22: labeled controls, keyboard operable, visible focus.
- PRD §11: all settings labels translated in both languages.

## M17. Polish and accessibility pass

Scope: the PRD M8 checklist.

Acceptance criteria:

- PRD §31 (M8) review items each checked and recorded: mobile, tablet, desktop, accessibility, loading, empty, and error states, animations, reduced motion, performance, notifications, theme, RTL.
- Contrast meets WCAG AA in both themes and both directions.
- Keyboard-only run-through of the entire PRD §33 flow succeeds.
- No raw errors or stack traces are user-visible (PRD §24).

## M18. Metadata and SEO

Scope: title, description, heading hierarchy, favicon, Open Graph and Twitter metadata, social preview image.

Acceptance criteria:

- PRD §25: all listed items present; one `h1` per page; language-aware `<html lang>`.
- `metadataBase` comes from a documented environment variable (or is omitted, decision recorded).
- No advanced SEO work.

## M19. Production readiness

Scope: PRD M9 checklist and deployment docs.

Acceptance criteria:

- Every PRD §31 (M9) item verified and recorded, including: build succeeds, no console errors, no broken routes, timer accurate in background, transitions correct, stats correct, persistence works, fa/en, RTL/LTR, numerals, calendars, mobile, accessibility basics, notifications, audio.
- PRD §33: the 28-item Definition of Done walked through end to end.
- Dependency audit: nothing unused (`pnpm why`, review against DECISIONS.md).
- Environment variables and deployment instructions documented.
