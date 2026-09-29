# AGENTS.md

## Project

This is a Persian-first Pomodoro productivity application built with:

- Next.js
- App Router
- React
- TypeScript
- Tailwind CSS

The complete product requirements are in:

`docs/PRD.md`

**Read the relevant parts of that file before implementing product features.**

Related docs:

- `docs/DECISIONS.md`: technical choices and their tradeoffs
- `docs/ARCHITECTURE.md`: layers, folder structure, timer engine
- `docs/MILESTONES.md`: ordered milestones with acceptance criteria

---

## Commands

Package manager: pnpm. Do not use npm or yarn.

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck` (runs both `tsconfig.json` and `tsconfig.domain.json`)
- `pnpm test` (Vitest, runs once)
- `pnpm test:watch`
- `pnpm check` (lint + typecheck + test; run before finishing any task)

These scripts are created in Milestone 0.

---

## Core Development Rules

### 1. Follow the specification

`docs/PRD.md` is the source of truth for product requirements.

Do not invent features or expand scope without explicit instruction.

When requirements are ambiguous, choose the simplest solution consistent with the specification and document the decision when appropriate.

### 2. Work incrementally

Do not implement the entire product in one change.

Work milestone-by-milestone.

Keep the application runnable after each meaningful change.

Before starting a large implementation, inspect the existing code and architecture.

### 3. Keep architecture simple

Prefer:

- Simple code
- Clear boundaries
- Small components
- Reusable domain logic
- Minimal dependencies

Avoid:

- Premature abstraction
- Over-engineering
- Large UI libraries unless justified
- Unnecessary dependencies
- Speculative infrastructure

### 4. Timer is critical

The timer must use timestamp-based timing.

Do not rely on naive decrementing `setInterval` logic.

The timer engine must be independent from:

- Timer visualization
- React UI
- Persistence
- Audio
- Statistics

The timer must remain accurate when the browser tab is in the background.

The timer state must survive reload and browser close, and come back paused. Each browser tab is an independent timer session (see PRD section 5). The engine only exposes serializable state and accepts restored state; saving and loading happen in the application layer through a repository.

`src/domain` is pure TypeScript: no React, Next, DOM, storage, `Date.now()`, `new Date()` without arguments, or `Math.random()`. Time and IDs are injected. Storage access lives only in `src/data/local` (shared data) and `src/data/session` (per-tab state). See `docs/ARCHITECTURE.md`.

### 5. Localization is first-class

The application supports:

- Persian
- English
- RTL
- LTR
- Persian numerals
- Latin numerals
- Jalali
- Gregorian

Never hardcode user-facing strings inside components.

Use the localization system.

RTL must be implemented deliberately using logical CSS properties where possible.

#### i18n conventions

- All UI text comes from `t('key')`. No string literals in JSX (lint-enforced).
- `en.ts` defines the message shape; `fa.ts` must satisfy it. Add both in the same change.
- Keys are namespaced and dotted, for example `timer.controls.start` and `settings.calendar.secondary`.
- Numbers, durations and dates go through the `i18n` and `domain/calendar` formatters only. Do not call `toLocaleString`, `toFixed` or `Intl` directly in components.
- Language, numerals and calendar are independent settings. Never derive one from another except for the documented first-run defaults.
- Logical CSS only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`. Do not use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`.
- Directional icons must mirror in RTL. Verify each new component in both directions.

### 6. Data and persistence

V1 is guest-first and local-first.

Do not require authentication.

Do not introduce a backend dependency for functionality that can work locally.

Keep persistence behind repositories/data-access abstractions so cloud sync can be added later without rewriting the UI.

### 7. Product scope

Do not build yet:

- Payments
- Subscription infrastructure
- Mandatory accounts
- Cloud sync
- Full project management
- Team collaboration
- Social features
- AI assistant
- Native apps
- Browser extension
- Complex external music integrations

Unless explicitly requested.

### 8. Accessibility

All interactive UI should support:

- Keyboard navigation
- Visible focus
- Semantic HTML
- Accessible labels
- Appropriate ARIA
- Sufficient contrast
- Reduced motion

Do not rely only on color.

### 9. Responsive design

The application must work on:

- Desktop
- Tablet
- Mobile

Do not simply shrink the desktop UI.

The mobile experience should be intentionally designed.

### 10. Testing

Prioritize business-logic tests.

Especially test:

- Timer behavior
- Session transitions
- Long-break logic
- Statistics
- Streaks
- Date/calendar calculations
- Localization behavior

Run relevant tests and a production build after significant milestones.

### 11. Before changing code

Always:

1. Inspect the existing implementation.
2. Identify the smallest appropriate change.
3. Check relevant requirements in `docs/PRD.md`.
4. Implement.
5. Test.
6. Review the result for regressions.

Do not rewrite working code unnecessarily.

### 12. Definition of done (per change)

1. Matches the cited PRD section and the current milestone's acceptance criteria.
2. `pnpm check` passes; `pnpm build` passes for milestone-level work.
3. Domain changes have tests in the same change.
4. The app runs with no console errors.
5. UI changes are verified in fa/RTL and en/LTR, light and dark, mobile and desktop widths.
6. New interactive UI is checked for keyboard use and accessible names.
7. A new dependency is recorded in `docs/DECISIONS.md` with a justification.
8. A resolved ambiguity is recorded in `docs/DECISIONS.md`.

### 13. Final principle

Ask:

> Does this make the user's focused-work experience simpler, clearer, and better?

Build the simplest excellent version first.
