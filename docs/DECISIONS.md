# Technical Decisions

Status: Accepted. Implementation begins at Milestone 0 (see `MILESTONES.md`).

Guiding constraints: `AGENTS.md` (minimal dependencies, simple architecture, timer independence, local-first) and `docs/PRODUCT_SPEC.md` (source of truth). Versions are intentionally not pinned here; pin the current stable releases at scaffold time.

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
**Tradeoff:** IndexedDB scales better and is asynchronous natively, but has a heavier API, needs more testing setup (fake-indexeddb), and is overkill at expected volume. Estimate: 20 sessions/day * ~150 B * 365 = about 1.1 MB/year. Month bucketing keeps that workable for years. The risk is a user who logs heavy multi-year history; the async repository interface lets us migrate storage later without touching the UI. Revisit if a year of data exceeds about 2 MB.

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
