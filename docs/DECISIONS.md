# Technical Decisions

Status: Accepted. Implementation begins at Milestone 0 (see `MILESTONES.md`).

Guiding constraints: `AGENTS.md` (minimal dependencies, simple architecture, timer independence, local-first) and `docs/PRD.md` (source of truth). Versions are intentionally not pinned here; pin the current stable releases at scaffold time.

Runtime dependency budget for V1: `next`, `react`, `react-dom`, one Jalali conversion library. Nothing else at runtime unless a milestone justifies it in this file.

---

## D1. Package manager and test runner

**Decision: pnpm + Vitest.**

- pnpm is already installed on the dev machine, is fast, and gives a strict `node_modules` (no phantom dependencies), which supports the "minimal dependencies" rule. Commit `pnpm-lock.yaml`; set `packageManager` in `package.json`.
- Vitest runs TypeScript natively with zero transpile config, has fake timers, and has a Jest-compatible API. The domain layer is pure TS, so tests run in the `node` environment. Component tests, if any, opt in to `jsdom` per file. Add `jsdom` only when the first component test needs it.

**Alternative considered:** npm + Jest (via `next/jest`).
**Tradeoff:** npm needs no extra install, but Jest is slower and needs more TS/ESM configuration. That is friction for a project whose priority is business-logic tests. pnpm requires contributors to have it (corepack solves this).

---

## D2. i18n approach

**Decision: custom, typed, dependency-free i18n.**

- Two typed message dictionaries: `en.ts` defines the shape (`Messages`), `fa.ts` is `satisfies Messages`. A missing key is a compile error. A test also asserts key parity.
- A tiny `t(key, params?)` with `{name}` interpolation. Plurals use `Intl.PluralRules`. No ICU parser.
- Formatting uses the platform `Intl` API only (`Intl.NumberFormat` with `numberingSystem` set to `arabext` or `latn`, `Intl.RelativeTimeFormat`, `Intl.PluralRules`). Numerals are therefore independent of language, as PRD section 12 requires.
- No locale-prefixed routes. Language is a user setting (PRD section 16), not a URL. The chosen locale is mirrored to a cookie so the server layout can render `<html lang dir>` without a flash. The default is Persian.
- Server Components read the cookie and pass the dictionary to a provider. Client Components use a `useT()` hook.

**Alternative considered:** `next-intl`.
**Tradeoff:** `next-intl` gives ICU messages, routing, and RSC integration for free, but adds a dependency and pushes toward locale-prefixed URLs. The product has two languages, no localized content pages, and guest-only state, so most of that value is unused. The cost of custom is that we own about 100 lines of code and no ICU plural or select syntax. Two languages with simple plural rules (Persian has no meaningful plural distinction) make that acceptable. If a third language or rich messages appear, migrate; the `t()` call sites stay the same.

---

## D3. Jalali / Gregorian date handling

**Decision: `jalaali-js` (conversion only), wrapped in one module `domain/calendar`. `Intl` is used for display formatting.**

- Canonical storage is always a Gregorian local date string `YYYY-MM-DD` (the session's `localDate`). Jalali is a presentation and grouping-boundary concern only. All arithmetic (streaks, week and day grouping) happens on Gregorian date strings or day indexes, so streak logic is calendar-independent.
- `domain/calendar` exposes: `toJalali(date)`, `fromJalali(y, m, d)`, `jalaliMonthLength`, `startOfJalaliMonth`, `startOfWeek(date, weekStart)`, and so on. Nothing else imports `jalaali-js`.
- Display names of months and weekdays come from `Intl.DateTimeFormat('fa-IR-u-ca-persian')` (or `en-US-u-ca-gregory`). No hand-written month tables.
- Local date from a timestamp uses `Intl.DateTimeFormat` with an injected IANA `timeZone`. This makes DST and midnight tests deterministic and independent of the CI machine's timezone.

**Alternative considered:** `date-fns-jalali` (or `date-fns` + `date-fns-jalali`).
**Tradeoff:** it offers a richer API (add months, start-of-week) but is a much larger surface than we need, and it would encourage Jalali-typed dates to leak beyond the calendar module. `jalaali-js` is tiny and does one thing. The cost is that we write the few helpers (month length, start of Jalali month) ourselves. Temporal is not used because support is not universal yet.

**Risk to verify in M9:** `Intl`'s Persian calendar (ICU) and `jalaali-js` can disagree on leap years far from the present. Add a test that compares the two across, say, 1300-1500 AP and fix the source of truth (`jalaali-js` for arithmetic; use `Intl` only for names, using year/month/day numbers we supply).

---

## D4. Persistence mechanism and schema versioning

**Decision: `localStorage` behind async repository interfaces, with a versioned envelope and pure migrations.**

- Repositories (`TaskRepository`, `SessionRepository`, `SettingsRepository`, `GoalRepository`) are interfaces defined in `domain`. Every method returns a `Promise`, even though `localStorage` is synchronous. This keeps a future IndexedDB or cloud implementation a drop-in swap (PRD section 19, AGENTS rule 6).
- Storage layout:
  - `pomodoro.schemaVersion` = integer
  - `pomodoro.settings`, `pomodoro.goal`: single JSON values
  - `pomodoro.tasks`: JSON value holding the task list
  - In `sessionStorage` (per tab, so each tab is an independent timer session, PRD section 5):
    - `pomodoro.timer`: the serializable `TimerState` plus `savedAt`. Written on every engine state change and on `pagehide`/hidden, with no periodic or heartbeat writes. A timer that was running is restored as paused.
    - `pomodoro.selectedTask`: the tab's selected task ID.
  - `pomodoro.sessions.<YYYY-MM>`: one key per Gregorian local month, holding an array of completed work sessions. This bounds the parse cost of any single read and keeps each value far below the ~5 MB origin quota.
- Shared data is written by several tabs, so every repository write is an operation-level read-modify-write of the current stored value, never an overwrite from a cached copy. Stale views in other tabs are accepted in V1.
- Read path: `JSON.parse` in try/catch, then a hand-written type guard/normalizer (no `zod`). Corrupt or unknown data falls back to defaults and is never surfaced as a stack trace (PRD section 24).
- Versioning: `migrations: Array<(store) => void>`, indexed by version, run in order on boot. Migrations are pure functions of the raw data and are unit-tested with fixture snapshots.
- Handle `QuotaExceededError` and unavailable storage (private mode) by degrading to an in-memory repository with a non-blocking notice.
- SSR: repositories are only touched from Client Components in effects. There must be no server read of `localStorage`.

**Alternative considered:** IndexedDB (raw API, or the small `idb` wrapper).
**Tradeoff:** IndexedDB scales better and is asynchronous natively, but has a heavier API, needs more testing setup (fake-indexeddb), and is overkill at expected volume. Estimate: 20 sessions/day _ ~150 B _ 365 = about 1.1 MB/year. Month bucketing keeps that workable for years. The risk is a user who logs heavy multi-year history; the async repository interface lets us migrate storage later without touching the UI. Revisit if a year of data exceeds about 2 MB.

---

## D5. State management

**Decision: no state library. React Context plus `useReducer` for UI/settings state, and `useSyncExternalStore` over the timer engine's own subscribe API.**

- The timer engine is a plain TS object with `subscribe` and `getSnapshot`. A thin hook binds it to React via `useSyncExternalStore`. This keeps the engine independent of React (AGENTS rule 4). Persistence of its state (`getState()` and `restore`) is handled by the application layer, not the engine.
- Settings, tasks, and goal each get a small provider that loads from its repository and writes through it.
- Statistics are computed on demand from session records (PRD section 9: derive, don't duplicate). Memoize per date range with `useMemo`.
- Domain events (`sessionCompleted`, and so on) are consumed by a small application-layer wiring module, which persists the session, plays sound, notifies, and toasts. The engine does not know about any of these.

**Alternative considered:** Zustand.
**Tradeoff:** Zustand reduces provider boilerplate and has a good persistence middleware, but it adds a dependency, and its middleware would blur the repository boundary. The app has four small state domains; Context plus a reducer is enough. The cost is a little more boilerplate and the need to split contexts to avoid over-rendering. The 1 Hz timer tick is isolated in the engine snapshot, so only the timer display subscribes to it.

---

## D6. Persian font and fallback stack

**Decision: Vazirmatn (variable, OFL-licensed), loaded through `next/font/google` (self-hosted at build time; if the build environment has no network, switch to `next/font/local` with a committed file), subsets `arabic` and `latin`.**

- One family for both scripts keeps typography consistent when languages switch. Vazirmatn's Latin glyphs are adequate for English.
- `font-display: swap`, exposed as a CSS variable `--font-sans`.
- Fallback stack: `var(--font-vazirmatn), "Segoe UI", Tahoma, system-ui, -apple-system, "Noto Sans Arabic", sans-serif`. Tahoma and Noto Sans Arabic provide Persian glyph coverage if the webfont fails.
- Timer digits use `font-variant-numeric: tabular-nums`. **To verify in M5:** Vazirmatn's Persian digits must not jitter as they change. If tabular figures are not supported for Persian digits, render each digit in a fixed-width box.
- Local hosting is preferred for reliability from Iranian networks at runtime. `next/font` self-hosts at build time in both variants, so runtime never calls Google.

**Alternative considered:** system fonts only (Tahoma / Noto Sans Arabic / system-ui).
**Tradeoff:** zero font weight and zero layout shift, but Persian rendering quality varies widely by OS and the "premium typography" goal (PRD section 17) suffers. Vazirmatn costs one variable font file (arabic subset only, tens of KB) and a small swap shift, which the fallback stack limits.

---

## D7. PWA and notifications: in or out of V1

**Decision: browser Notifications API is IN (the PRD requires it). PWA (service worker, manifest, offline, install prompt) is OUT of V1.**

- Notifications: use the `Notification` API directly, wrapped in a `platform/notifications` adapter. Request permission only after a meaningful user gesture (for example, when the user turns on the setting or starts a first session), never on page load. If the state is `denied` or unsupported, the app continues and does not ask again (PRD section 15). Wrap in try/catch, because Chrome on Android throws on `new Notification()` without a service worker. On failure, fall back to sound and toast only.
- PWA is not in the PRD, and AGENTS rule 3 forbids speculative infrastructure. The PRD does not require offline support or install.
- Note: because the app is local-first with no backend calls, it works offline once loaded. Only cold offline start is missing.

**Alternative considered:** add a minimal service worker and web manifest in V1.
**Tradeoff:** it would enable reliable Android notifications, installability, and offline cold start, and improve the "background tab" story. But it adds scope: caching strategy, update flow, testing, and cache-versioning bugs. It is deferred until the core is polished. Android Chrome notification support is not a launch requirement. On platforms where `new Notification()` throws, the app falls back to sound and toast. If this changes later, a notification-only service worker (no caching) is the smallest addition.

---

## Summary of decisions

- **Package manager and test runner:** pnpm + Vitest; alternative npm + Jest.
- **i18n:** custom typed dictionaries plus `Intl`; alternative `next-intl`.
- **Jalali:** `jalaali-js` plus `Intl` for display; alternative `date-fns-jalali`.
- **Persistence:** `localStorage` behind async repositories for shared data, `sessionStorage` for per-tab timer state, month-bucketed sessions, versioned migrations; alternative IndexedDB.
- **State:** Context + `useReducer` + `useSyncExternalStore`; alternative Zustand.
- **Font:** Vazirmatn via `next/font` with a Tahoma/system fallback; alternative system-only.
- **PWA and notifications:** Notifications API in, PWA out; alternative minimal notification-only service worker.

---

## Resolved product ambiguities

These fill gaps in `PRD.md`. They are binding, and supplement the PRD where it is silent.

- **Timer persistence:** the timer state is saved per browser tab, restored paused, and independent between tabs (PRD section 5; `ARCHITECTURE.md` section 4.4).
- **Long-break cycle counter:** derived from today's completed work sessions (`count mod sessionsBeforeLongBreak`), never stored. It counts sessions from any tab.
- **Tasks:** create, edit (title), delete and complete or reopen, in either status. Deleting needs no confirmation. Deleting a task keeps its Pomodoro records. Only incomplete tasks are selectable. The selection is per tab (PRD section 8).
- **Selected task and completion:** a completed Pomodoro is associated with the task selected at the moment of completion, not at the start.
- **Sessions stored:** only completed work sessions are persisted. Skipped and reset sessions and breaks are not stored, and the session type field is kept for forward compatibility.
- **Streak rule:** a local date is active if it has at least one completed work Pomodoro. The current streak counts consecutive active dates ending today, or ending yesterday if today has none yet. The daily goal does not affect streaks. Grouping uses the stored local date, never UTC.
- **Daily goal unit:** Pomodoros only.
- **Week start:** Saturday when the primary calendar is Jalali, Monday when it is Gregorian. "This week" means the calendar week, not a rolling 7 days.
- **Numeral default:** Persian numerals when the language is Persian, Latin when English. The setting stays independent of language afterwards.
- **Calendar defaults and secondary calendar:** Jalali for Persian and Gregorian for English at first run. The secondary calendar appears only in statistics heatmap cells and date labels.
- **Reset and skip:** Reset asks for confirmation only when a session is running or paused. Skip has no confirmation.
- **Locale and URLs:** no locale prefix in URLs. Language comes from a setting mirrored to a cookie, so there is one URL per page and no hreflang.
- **Server and Client Components:** Server Components for the layout, metadata and `<html lang dir>`. Everything that uses settings, tasks, timer, audio or statistics is a Client Component.
- **Background completion lateness:** browsers throttle hidden tabs, so the completion sound and notification can be up to about a minute late. The displayed time is always exact. A Web Worker driver is a later option that does not touch the engine.
- **Android notifications:** not a launch requirement. The app falls back to sound and toast where notifications throw.
- **Accessibility contrast:** WCAG AA in both themes and both directions.
- **Not in V1 (not specified by the PRD):** tab-title timer display, data export or clear, analytics, cross-tab live sync.
- **Analog visualization:** required by the PRD but missing from its milestone list, so it is Milestone 14.

## M0 scaffold notes

- **TypeScript 6.0.3, not 7.x:** `typescript-eslint` (used by `eslint-config-next`) refuses to run on TypeScript 7.0. Pinned to the newest 6.x. Revisit when typescript-eslint supports TS 7.1 or later.
- **ESLint 9.39.4, not 10.x:** `eslint-plugin-react` (pulled in by `eslint-config-next`) crashes on ESLint 10 (`context.getFilename is not a function`). Pinned to ESLint 9. Revisit when the plugin supports ESLint 10.
- **Test files are excluded from `tsconfig.domain.json`:** the project has `types: []` and no DOM, so `vitest` imports would not resolve. Tests are type-checked by `tsconfig.json`. Domain source files remain checked without DOM or Node types.
- **`agentRules: false` in `next.config.ts`:** `next dev` otherwise appends its own block to `AGENTS.md` on every run.

## M1 notes

- **Hardcoded `lang="fa" dir="rtl"`:** the locale cookie belongs to M3. Until then the layout uses the documented default (Persian, RTL).
- **Theme is in memory until M2:** the UI may not touch storage (lint-enforced) and the settings repository does not exist yet. An inline script in `<head>` sets the `dark` class from `prefers-color-scheme` before first paint. `ThemeToggle` flips the class, and the choice is lost on reload. M2 wires persistence (and the cookie mirror for no-flash).
- **i18n seed (`src/i18n/messages.ts`):** lint forbids JSX text literals, so M1 needs strings before M3. It contains typed `en`/`fa` dictionaries and a `t(key)` that always returns Persian. M3 replaces `t` with locale-aware lookup and keeps the key names. A small key-parity test exists already.
- **Font:** Vazirmatn via `next/font/google`; the build succeeded, so no local file was needed.
- **Icons:** hand-rolled inline SVG (`currentColor`), no icon dependency.
- **Tokens:** CSS variables per theme (`:root`, `.dark`) mapped into Tailwind with `@theme inline`; another theme is another selector. Dark variant is class-based via `@custom-variant`.
- **Navigation:** sidebar from `md` up, fixed bottom tab bar below. The `md` breakpoint (768px) is the switch. Only nav and theme toggle live in the shell; the toggle is only in the sidebar for now (mobile has no toggle until M17/M16 settings).

## M2 notes

- **No envelope wrapper:** D4's layout is used (separate keys plus a `pomodoro.schemaVersion` key). "Schema envelope" in MILESTONES means that version key. Migrations run in `createSettingsRepository` on boot; data from a newer version is left untouched.
- **Invented v0 fixture:** no released v0 exists. v0 is defined as a legacy flat settings blob (`{ theme, language, workMinutes, ..., autoStart }`); v1 is the nested `UserSettings` shape. This only exercises the migration runner.
- **Theme is `system | light | dark`** (default `system`). The toggle sets an explicit light or dark. The choice is mirrored to the `pomodoro-theme` cookie so the server renders the `dark` class on first paint. Only first-time visitors or `system` use the inline `matchMedia` script. A user with stored settings but no cookie (before this change) sees one possible flash.
- **Layout is now dynamic** because it reads the cookie (M3 needs this for the locale cookie anyway).
- **Repository ports for tasks, sessions, timer state and goal** are minimal, and their entity types are minimal type-only files (`domain/tasks`, `sessions`, `goals`). The milestone that implements each one refines them. (`PersistedTimerState` moved into `domain/timer/types.ts` in M4.)
- **Settings durations are stored in minutes** (user units); the timer converts to ms. Normalization clamps: work 1-180, short break 1-60, long break 1-120, sessions before long break 1-12.
- **Storage fallback:** if storage is unavailable, stores fall back to memory and expose `persistent: false`. The non-blocking notice UI is deferred to M17.
- **Storage lint rule** (`no-restricted-globals` and properties) now also covers `src/platform`. Verified once with a temporary bad import in `src/ui`, then removed.
- **Deviation in Provider timing:** settings load in an effect after hydration (SSR must not read storage), so other settings render defaults for one frame. Theme is unaffected thanks to the cookie.

## M3 notes

- **Files:** `src/i18n` is now `en.ts` (shape), `fa.ts` (`satisfies`), `locale.ts`, `translate.ts`, `format.ts`, `index.ts`. The M1 `messages.ts` seed is gone; key names are unchanged. `t()` is no longer a global: components get it from `useT()` (`application/providers/LocaleProvider`).
- **Language source of truth:** the `language` setting. The `pomodoro-locale` cookie is only a mirror so the server can render `<html lang dir>`. Until settings load, the server-provided locale is used; then the setting wins.
- **No numerals cookie:** the shell has no numbers yet. The timer (M5) will show digits and must avoid a one-frame numeral flash (for example by mirroring numerals into a cookie too).
- **Independence:** switching language does not change numerals or calendar. Only `defaultSettings(language)` derives them, on first run. A first-time visitor who switches to English keeps Persian numerals until the numerals control exists (M16).
- **Client components:** `AppShell` and `PagePlaceholder` became client components to use `useT()`. They still render server-side with the right language.
- **Temporary language switch:** `LanguageSwitch` is in the desktop sidebar and on the `/settings` placeholder (mobile only, since mobile has no sidebar). Replaced in M16.
- **No plurals or missing-param handling beyond `{name}` interpolation:** no message needs them yet. No message uses a placeholder yet, so `translate` interpolation is untested until one does.
- **Unknown locale cookie values** fall back to Persian.

## M4 notes

- **Construction-time events:** `createTimerEngine` takes an optional `onEvent` dep. The zero-remaining restore edge case completes during construction, before anyone can call `engine.onEvent`, so the caller passes its subscriber in the deps. No event buffering.
- **`getSnapshot()` is pure:** it reports `remainingMs = 0` when due but never completes a session; only `tick()` does. It is called during React render, where side effects are unsafe. This differs from the wording in ARCHITECTURE 4.2 (now corrected).
- **Cycle counter resets when the long break ends or is skipped** (as ARCHITECTURE 4.6 says). During the long break the snapshot counter equals `sessionsBeforeLongBreak`, one past the `0..n-1` range, and `setCompletedWorkInCycle` is ignored while idle on a long break so the app layer's derived `count mod n` cannot zero it early.
- **Skipping work goes to a short break** (the counter is untouched, so a skip never leads to a long break). Skipping any break goes to work. `skip` also works while idle.
- **`tick()` notifies subscribers** when the displayed remaining time changed, not only on state changes, so `useSyncExternalStore` repaints. `version` still changes only on state changes, and snapshots keep their identity while `(version, remainingMs)` is unchanged.
- **Auto-start emits no separate `started` event:** `transitioned.autoStarted` carries it. Event order on completion is `completed`, `transitioned`.
- **Idle durations follow the config:** `updateConfig` refreshes `plannedMs` of an idle upcoming session, and an idle restore takes `plannedMs` from the current config. Running and paused sessions are never altered.
- **Restore validates input:** `restoreTimerState` accepts `unknown`. Anything that is not a valid `PersistedTimerState` becomes a fresh idle work timer (M5's "corrupt state" criterion). A paused state with 0 remaining also completes on restore, with `completedAt = savedAt`.
- **Extras beyond the listed scope:** `timerConfigFromSettings` (minutes to ms), `countWorkSessionsOn` (today's work sessions, so the cycle counter is testable across a day boundary), and `platform/clock.ts` (`systemClock`). `FakeClock` lives in `domain/timer/testing.ts`.
- **`SessionType`** is defined once in `domain/timer/types.ts` and re-exported from `domain/sessions/types.ts`.

## M5 notes

- **`TimerProvider` is mounted in the root layout**, inside the settings and locale providers, not in the page. If it lived in `/`, navigating to another route and back would rebuild the engine from saved state and turn a running timer into a paused one. ARCHITECTURE section 2 lists providers but does not say this.
- **The engine is created only after settings have loaded** (they load asynchronously after hydration), because the engine needs the real durations. Until then the timer shows an empty placeholder, which also avoids a numeral or duration flash. Consequence: the timer is not interactive for the first frame or two.
- **Initial save at boot:** persistence saves once when it attaches, not only on version changes. Otherwise a restore that completed a zero-remaining session would be replayed by the next reload, because the stored state would still say "about to complete".
- **Cycle counter input** is a `getCompletedWorkToday` prop on `TimerProvider` (default `() => 0`). It is applied at boot and just before a manual Start. An auto-started work session is not re-derived here; M6's event subscriber does that.
- **"Restored paused" flag** lives in the provider (true when boot restored a running or paused state, cleared on the next Resume, Reset, Skip or Start). The engine knows nothing about it. The UI shows a bordered text label plus a ringed Resume button.
- **Reset is disabled while idle** (nothing to reset). The confirmation dialog appears only for running or paused sessions. Skip has no confirmation.
- **Dialog** is a hand-rolled primitive on native `<dialog>` and `showModal()`: focus trap, Esc, and focus return come from the platform. No dependency. A synthetic `.click()` does not focus the trigger, so focus return was only checked by reasoning and the platform behavior, not by a pointer test.
- **Digit jitter (D6) verified:** in Chromium every Persian (۰-۹) and Latin digit measured the same width under `tabular-nums` with Vazirmatn (59.72 px and 50.51 px at the 5.5rem size). No per-digit boxes needed. Not checked in Safari or Firefox.
- **Clock text is always `dir="ltr"`** so `mm:ss` is not reordered in RTL. Digits still follow the numeral setting.
- **`formatClock`** was added to `i18n/format.ts` (rounds partial seconds up, minutes are not capped at 99).
- **Session-storage keys** live in `src/data/session/keys.ts`, separate from the shared `data/local` keys.
- **`useTimerDriver` uses `systemClock`** for the one-shot wake-up timeout. Hidden-tab behavior was covered by engine tests (multi-hour gap); the browser was not backgrounded for minutes in manual testing.
- **Not built (later milestones):** toast, sound, notification, session recording (M6); task selection UI (M7). The selected-task-ID methods exist on the repository and are tested, but nothing calls them yet.

## M6 notes

- **Files:** `domain/calendar/localDate.ts` (`localDateOf`, `Intl` with an injected time zone), `domain/sessions/record.ts` (`IdGenerator`, `sessionFromCompletion`), `data/local/sessionRepository.ts`, `platform/{notifications,ids,timeZone}.ts` and `platform/audio/completionSound.ts`, `application/timer/{completionHandler,devOverrides}.ts`, `application/providers/ToastProvider.tsx`, `ui/shell/ToastHost.tsx`.
- **Sessions are stored per Gregorian local month** (`pomodoro.sessions.<YYYY-MM>`, D4). `add` is a read-modify-write of the current stored month, and ignores an ID that is already stored. Corrupt JSON or malformed items read as empty or are dropped. A write that fails (quota) is dropped silently; unavailable storage is covered by the in-memory fallback.
- **The completion sound is synthesized** (two WebAudio tones), so there is no audio asset. `unlockAudio()` runs inside the Start click so that later playback from a timer callback is allowed. It is gated by `notifications.sound`; `audio.enabled` is reserved for focus audio (M15).
- **Notification permission** is requested on the Start click, only while the state is `default` (never on load, never again after a grant or denial). If that first ask is granted, `notifications.browser` is set to true. This is a temporary stand-in until the settings toggle exists (M16). A user whose permission was already granted elsewhere keeps `notifications.browser` at its default (false) until M16.
- **Notifications and sound fire for work completion only**, as the M6 criteria say. Break endings are silent for now.
- **Toast** is an application provider (`ToastProvider`) plus a UI host, not a platform adapter as ARCHITECTURE 4.7 implies. One message at a time, dismissed after 6 s or with a button, in a persistent `role="status"` live region above the mobile tab bar. A restored zero-remaining completion also shows the toast (allowed by ARCHITECTURE 4.4).
- **Selected task** is a `() => null` stub in `TimerProvider` until M7 wires the selection and the existing-task check.
- **Dev-only shortening:** `?devSeconds=N` makes every session N seconds long for that page load. Ignored when `NODE_ENV === 'production'`.
- **Cycle counter** is read from today's stored sessions at boot and right before a manual Start (Start now waits one async read before starting the engine). `TimerProvider` no longer takes `getCompletedWorkToday`.
- **Docs that turned out wrong:** the M5 note and ARCHITECTURE 4.6/MILESTONES M5 say the subscriber re-derives the counter before an auto-started work session. That is not possible: `setCompletedWorkInCycle` only applies while idle, and an auto-started session is already running. An auto-start chain relies on the engine's in-memory counter, which can only drift if another tab completes sessions in the meantime; the next manual Start or reload corrects it.
- **Sound on every session end (change after M6 review):** focus, short break and long break all play the completion sound when they finish naturally (gated by `notifications.sound`, silent for restored completions and for skip/reset). Recording, notification and toast remain work-only.
- **Snapshot loop fix:** `engine.getSnapshot()` recomputes `remainingMs` from the clock on every call, so two calls in one render could differ across a millisecond boundary and `useSyncExternalStore` looped ("Maximum update depth exceeded", seen with devtools open, when renders are slow). `TimerProvider` now caches the snapshot and refreshes it only when the engine notifies. ARCHITECTURE 4.1 describes `getSnapshot()` as recomputing from the clock; that is right for the engine but must not be handed to `useSyncExternalStore` directly.

## M7 notes

- **Files:** `domain/tasks/rules.ts` (rules and selection), `data/local/taskRepository.ts`, `application/providers/TasksProvider.tsx`, `ui/tasks/{TaskPanel,TaskItem}.tsx`.
- **Storage:** all tasks live in one `pomodoro.tasks` array in local storage. Every repository write re-reads the current array and writes it back in one synchronous block, so tabs never erase each other's tasks. Malformed items are dropped, corrupt JSON reads as empty. No schema change. After each write the panel re-lists from storage, so it also shows tasks added in another tab.
- **Title rules (invented, PRD is silent):** trimmed, must not be empty, cut to 200 characters.
- **Order:** incomplete tasks oldest first (new tasks at the bottom); completed tasks in their own group, most recently completed first.
- **Selection is derived, not repaired:** the raw id stays in session storage, and `effectiveSelection` treats a missing or completed task as no selection. Completing or deleting the selected task in this tab also clears the stored id.
- **Selected task at completion:** `getSelectedTaskId` in the completion handler is now async (`Promise<string | null>`). It reads storage fresh, because a task may have been deleted in another tab and the zero-remaining restore completes during engine construction, before React state exists. The session is recorded when that read returns; toast and notification stay synchronous.
- **Panel layout:** from `lg` the panel sits at the inline end, 20rem wide, collapsing to a 4rem strip holding only the handle. Below `lg` it is stacked under the timer until the M8 drawer replaces it. The collapsed state is in memory only (not persisted).
- **Handle:** a chevron pointing toward the inline end (mirrored in RTL by `rtl:-scale-x-100`), rotated when collapsed. It has `aria-expanded` and `aria-controls`.
- **Select control:** the task title itself is a button with `aria-pressed`, plus a visible "Selected" text label. Completed tasks have no select control.
- **Docs that turned out wrong:** ARCHITECTURE 4.7 and the M6 stub imply a synchronous selected-task lookup; it cannot be, since existence must be checked against shared storage.

## M7 refinement notes (edge drawer and drag-to-select)

- **Replaces the side panel.** The always-visible, collapsible panel (and its stacked layout below `lg`) is gone. Tasks now live in one drawer opened by an edge tab, on desktop and mobile alike. This also delivers the mobile task drawer that MILESTONES M8 describes, so M8's "drawer" scope is already met; its remaining criteria (one-handed timer use, 44 px targets, selected task visible without opening) are covered here too and only need a check.
- **Edge tab:** a vertical tab at the inline-end edge (right in LTR, left in RTL) with a chevron pointing toward the screen center. It rests partly off-screen and slides in on hover and focus; on touch it shows a pressed state instead of hover.
- **Drawer modality:** non-modal from `md` up (so a task can be dragged from the drawer to the zone above the timer); modal below `md` (backdrop, focus kept inside, Esc closes, focus returns to the tab). Open state is in memory only.
- **Pointer-event drag, no dependency:** HTML5 drag and drop does not work on touch. The grip handle on each incomplete task starts a pointer drag; dropping over an element marked `data-drop-zone` selects the task. Esc or pointercancel aborts. The select button remains the keyboard and screen-reader way to select.
- **Drop zone:** a dashed zone above the timer on desktop ("Drag your task here" when empty) and at the top of the mobile drawer under "Currently selected task". Once filled it shows the task with a "Selected" label and a clear button (added so a selection can be removed; the first M7 UI could only change it).
- **Mobile timer view:** when a task is selected, a read-only chip above the timer shows it (no placeholder there), so the selection is visible with the drawer closed.
- **Not verified in a browser:** touch dragging and the RTL tab animation were checked only by typecheck, lint and build.

## M8 verification notes (mobile task drawer)

- **M8 is satisfied by the M7 edge drawer.** No separate mobile component was built. Below `md` the drawer is a modal side drawer (not a bottom sheet; the milestone allows either), with a backdrop, a Tab trap and Esc to close. The selected task shows in a read-only chip above the timer. Supersedes the "stacked under the timer until the M8 drawer" line in the M7 notes.
- **Focus on open:** focus now moves to the close button when the drawer opens (previously it fell to `body`), and returns to the edge tab on close.
- **Touch targets:** below `md` the edge tab is 44 px wide and the drag handle 44 px wide; the edge tab stays 32 px on desktop, where it is a pointer target.
- **Doc drift:** MILESTONES M7 ("collapsible panel", "arrow/handle") and M8 ("mobile drawer") describe two components, but both are now one drawer.
