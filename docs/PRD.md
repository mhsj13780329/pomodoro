# Persian-First Pomodoro App — Product Specification

## 1. Product Goal

Build a polished, production-ready **Persian-first Pomodoro productivity web app**.

The timer is the heart of the product. Tasks, statistics, goals, focus audio, customization, and localization should support the focused-work experience rather than compete with it.

Target users:

- Students
- Developers
- Existing Pomodoro users
- People trying Pomodoro for the first time

The app must launch with **Persian and English** support.

### Product principles

- Simple and fast
- Minimal + premium visual design
- Persian-first UX
- Useful without an account
- Accurate timer behavior
- Mobile and desktop friendly
- Accessible
- Privacy-conscious
- Avoid unnecessary complexity
- Do not build features that are not specified here

---

# 2. Technology

Use:

- **Next.js**
- Next.js App Router
- React
- TypeScript
- Tailwind CSS

Use current stable Next.js conventions.

### Architecture principles

Use Server Components by default.

Use Client Components where interactivity requires them, especially:

- Timer
- Task panel
- Focus audio
- Theme controls
- Interactive statistics
- Settings controls
- Localization controls

Keep dependencies minimal. Add a library only when it meaningfully simplifies a problem.

Recommended categories of libraries where appropriate:

- Reliable Jalali/Gregorian date handling
- Lightweight charts
- Theme management
- Validation/utilities

Do not introduce large UI frameworks unnecessarily.

---

# 3. Application Structure

The app is a **productivity dashboard**, not a single-purpose timer page.

Primary navigation should use a minimal sidebar/icon-based navigation rather than a traditional top navbar.

Primary sections:

- Dashboard / Timer
- Statistics
- Settings

There is **no `/tasks` route**.

Tasks are integrated into the Dashboard.

### Dashboard

Desktop layout:

- Large central timer
- Task panel integrated into the dashboard
- Minimal navigation
- Supporting controls/settings

The task panel should be collapsible using a small arrow/handle.

In RTL mode, directional UI should be mirrored appropriately.

Mobile:

- Do not force the desktop task panel layout
- Use a drawer, slide-over, or bottom sheet
- Timer must remain easy to use one-handed

---

# 4. Authentication and Accounts

The application is **guest-first**.

Users must be able to:

- Open the app
- Start a Pomodoro
- Create tasks
- Track statistics
- Configure settings

without creating an account.

Do not force signup.

Prepare the architecture for optional accounts/cloud sync in the future, but **do not implement authentication or cloud sync in V1 unless required by the architecture**.

---

# 5. Pomodoro Timer

## Defaults

- Work: 25 minutes
- Short break: 5 minutes
- Long break: 15 minutes
- Long break after 4 completed work sessions

## Controls

- Start
- Pause
- Resume
- Reset
- Skip

## Behavior

When a work session completes:

1. Record the completed Pomodoro.
2. Update relevant statistics.
3. Associate completion with the selected task if one exists.
4. Play completion sound if enabled.
5. Trigger browser notification if enabled/available.
6. Show a small non-blocking congratulatory toast/popup.
7. Automatically transition to the next session.
8. Automatically start the next session if auto-start is enabled.

Skipped work sessions must **not** count as completed Pomodoros.

Skipping a break has no statistics impact.

Pause may remain active indefinitely.

Reset must require confirmation:

> Are you sure? Your current session won’t count.

The active timer state **persists per browser tab** across page reloads, and across the browser's "reopen closed tab" and session-restore features.

When the user reloads or closes the tab, the timer state is saved and the timer is **paused**. When that tab comes back (reload, reopened closed tab, restored session), the timer loads in the same state, **paused**, with the same remaining time. The user resumes it manually.

Time spent closed does **not** count toward a session.

On restore:

- **Running when the tab closed:** restored as **paused**, with the remaining time as of the last save.
- **Paused:** restored as paused with the same remaining time.
- **Idle:** restored as idle on the persisted session type.

The restored paused state must be clearly visible in the UI (not only by color), so the user can tell the timer is waiting for them to resume.

The timer state is saved on every timer state change (start, pause, resume, reset, skip, completion, transition), and additionally when the page is being hidden or closed (so that the elapsed time of a running timer is captured). There is no periodic saving.

If the tab dies abnormally without any close event (browser crash, tab killed by the OS), the timer is restored as of its **last state change**. For example, a session that was started and never paused restores paused with its full duration remaining. This is accepted.

Edge case: if the saved remaining time is zero (the session ended at the moment the tab closed), the session is completed on restore and handled like a normal completion, except that completion sound and browser notification are not triggered, and the next session is prepared paused/idle and is not auto-started.

### Multiple tabs

Every browser tab is an **independent timer session**. A new tab starts with a fresh idle timer and has nothing to do with the timers in other tabs, whether they are running, paused or idle. Timers in different tabs never sync, never affect each other, and are not restored from each other.

Data that is not timer state is shared between tabs through local storage: tasks, settings, goals, and completed sessions. Repository writes must apply each change to the current stored data (not overwrite it with a stale in-memory copy) so that tabs never erase each other's completed sessions or tasks. Other tabs may show slightly stale lists until they reload; live cross-tab sync is not required in V1.

The selected task belongs to the tab (it is part of that tab's session state), not to the shared data.

The long-break cycle counter is **derived** from today's completed work sessions (local date), not stored separately: `completedWorkToday mod sessionsBeforeLongBreak`. The counter therefore restarts each local day.

---

# 6. Timer Accuracy

The timer must remain accurate when:

- Browser tab is in the background
- Browser throttles JavaScript timers
- The computer experiences temporary lag

Do NOT implement the timer as:

```text
remaining -= 1
```

using a naive `setInterval`.

Use timestamp-based timing.

Conceptually:

```text
endTime = currentTimestamp + duration
remaining = endTime - currentTimestamp
```

The timer engine should calculate remaining time from timestamps rather than trusting interval execution frequency.

The timer engine must be independent from the visual representation.

---

# 7. Timer Architecture

Separate:

### Timer Engine

Responsible for:

- Session state
- Current session type
- Start
- Pause
- Resume
- Reset
- Skip
- Completion
- Automatic transitions
- Completion events
- Accurate background timing
- Exposing serializable state and accepting restored state (persistence itself lives outside the engine)

### Timer Visualization

Responsible only for rendering timer state.

Initial visualizations:

1. Digital
   - Example: `24:37`

2. Analog
   - Clock face
   - Clock hands

Future visualizations should be possible without rewriting the timer engine.

---

# 8. Tasks

Tasks are intentionally simple.

V1 supports:

- Add task
- View tasks
- Edit task (title)
- Delete task
- Select task
- Switch selected task
- Complete task
- Mark a completed task as incomplete again

A task is either **incomplete** or **completed**. Add, view, edit, delete and change-status all work for tasks in either status. Completed tasks remain visible (for example, in a separate group) until deleted.

Rules:

- Only incomplete tasks can be selected.
- Completing the selected task clears the selection.
- Deleting a task never deletes Pomodoro session records. Sessions keep their `taskId`, and the UI treats a missing task as "no task".
- Deleting the selected task clears the selection in that tab. Other tabs treat a selection pointing at a missing task as no selection.
- The selection is per tab and persists across reloads of that tab.
- Deleting a task asks for no confirmation in V1 (simplest behavior; revisit if accidental deletion proves a problem).

Do NOT build:

- Priorities
- Deadlines
- Projects
- Subtasks
- Complex task management

The selected task is associated with the active Pomodoro.

When a work session is completed, the completed Pomodoro should be associated with that task.

Tasks are stored locally for guest users.

---

# 9. Statistics

Statistics should remain useful without becoming a dashboard full of unnecessary charts.

## Today

Show:

- Completed Pomodoros
- Focus time
- Completed tasks
- Daily goal progress

## Weekly

Show:

- Focus minutes
- Pomodoros per day
- Activity/calendar or heatmap-style visualization

## Long-term

Show:

- Total focus time
- Daily average
- Weekly average
- Current streak
- Longest streak
- Productivity trends
- Task completion
- Historical activity

Statistics should primarily be derived from completed session records rather than storing unnecessary duplicated derived data.

### Streaks

Define a deterministic streak rule based on the user's **local date/timezone**.

Avoid UTC/local-midnight bugs.

Document the rule in code or architecture documentation.

---

# 10. Daily Goals

Support a simple daily focus/Pomodoro goal.

The dashboard should show progress toward today's goal.

Example:

```text
3 / 6 Pomodoros
```

Keep goals simple in V1.

---

# 11. Localization

Support from launch:

- Persian/Farsi
- English

Persian is the primary language.

### Direction

Persian:

- RTL

English:

- LTR

Do not simply reverse the entire UI mechanically.

Use logical CSS properties where possible.

Examples:

- `margin-inline`
- `padding-inline`
- `inset-inline`
- logical borders/alignment

RTL behavior must be reviewed component-by-component.

### Translation architecture

Do not hardcode user-facing strings inside components.

All user-facing strings must use the localization system.

This includes:

- Navigation
- Buttons
- Settings
- Timer states
- Notifications
- Toasts
- Dialogs
- Empty states
- Errors
- Statistics
- Tasks
- Accessibility labels

---

# 12. Numerals

Support:

- Persian numerals
- Latin numerals

The user can choose the numeral system independently from language.

The setting should be applied consistently throughout the UI where appropriate.

---

# 13. Calendar

Support:

- Gregorian
- Jalali/Persian

Defaults:

- Persian mode → Jalali
- English mode → Gregorian

Calendar selection is independent from language.

The user can manually select either calendar.

Support an optional secondary calendar.

Example:

```text
Primary: Jalali
Secondary: Gregorian
```

The secondary calendar should appear smaller/subtler, such as in a corner of a calendar/day cell.

Use a reliable date/calendar library.

Do not implement calendar conversion manually unless absolutely necessary.

Pay special attention to:

- Month boundaries
- Year boundaries
- Local midnight
- Statistics grouping
- Streak calculations
- Jalali/Gregorian conversion

---

# 14. Focus Audio

Focus audio is an important feature.

It is **not a general music player**.

Possible sounds:

- Rain
- White noise
- Cafe ambience
- Nature
- Ambient/lo-fi-style focus sounds

V1 should provide a simple audio experience:

- Choose sound
- Play
- Pause
- Volume
- Enabled/disabled preference

Create a provider/source abstraction so future sources can be added without rewriting the UI.

Account for browser autoplay restrictions.

Focus audio should be available to free users.

Do not build external music integrations in V1.

---

# 15. Notifications and Sounds

## Browser notifications

Notify the user when a Pomodoro/session completes.

Request permission gracefully after meaningful user interaction.

Do not immediately request permission on initial page load.

If permission is denied/unavailable:

- App continues working
- Do not repeatedly ask

## Completion sound

Settings should allow users to enable/disable completion sounds.

---

# 16. Settings

Create a dedicated Settings section.

### Timer

- Work duration
- Short break duration
- Long break duration
- Sessions before long break
- Auto-start next session

### Appearance

- Light/dark mode
- Timer visualization
- Accent/theme options where appropriate

### Language

- Persian
- English

### Numerals

- Persian
- Latin

### Calendar

- Jalali
- Gregorian
- Secondary calendar toggle

### Notifications

- Browser notifications
- Completion sounds

### Focus audio

- Enabled/disabled
- Default volume

---

# 17. Visual Design

Overall style:

**Minimal + premium productivity app**

The timer should be the visual centerpiece.

Use:

- Strong spacing
- Clean typography
- Clear hierarchy
- Consistent proportions
- Subtle transitions
- Blue accent color
- Light mode
- Dark mode

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Large decorative shadows
- Excessive animations
- Clutter
- Decorative UI that distracts from focus

Premium feel should come from:

- Typography
- Spacing
- Proportions
- Consistency
- Interaction quality

not visual effects.

Animation should be subtle.

Respect `prefers-reduced-motion`.

---

# 18. Theme System

Support:

- Light
- Dark

Build the theme system so additional themes can be introduced later.

Do not build a large theme marketplace or dozens of themes in V1.

---

# 19. Local Persistence

Guest users need local persistence for:

- Tasks
- Settings
- Preferences
- Goals
- Completed sessions
- Active timer state (so the timer survives reload and browser close)
- Statistics-related data

Do not scatter direct `localStorage` access throughout components.

Use a data/persistence layer.

Recommended conceptual separation:

```text
UI
↓
Application State / Domain Logic
↓
Repositories / Data Access
↓
Local Persistence
```

The persistence architecture should allow a future cloud repository without rewriting the UI.

---

# 20. Data Model

Use concepts similar to:

### User / Guest

Represents the local user context.

### Task

Fields should include enough information for:

- ID
- Title
- Completion status (incomplete/completed; reversible)
- Creation, last-edit and completion timestamps (completion timestamp is cleared when a task is marked incomplete)

### PomodoroSession

Store:

- Session ID
- Task ID
- Session type
- Planned duration
- Actual/completion duration where useful
- Completion timestamp
- Local date
- Completion status

### TimerState

Store the minimum needed to restore the active timer:

- Status (idle/running/paused)
- Session type
- Planned duration
- End timestamp (when running) or remaining time (when paused)
- Time of the last save (used to compute remaining time when a running timer is restored as paused)

This state is stored per browser tab (see Section 5, Multiple tabs).

Do not store the long-break cycle counter; derive it from today's completed work sessions.

### Goal

Store the daily goal configuration.

### UserSettings

Store:

- Timer settings
- Theme
- Language
- Numerals
- Calendar
- Notifications
- Audio preferences
- Visualization
- Auto-start

Avoid storing values that can be reliably derived from completed sessions.

---

# 21. Time and Timezone

User-facing statistics must use the user's local date/time.

Do not group sessions by UTC date.

Be careful around:

- Midnight
- DST changes
- Background tabs
- Browser sleep
- Session completion near midnight

Timer accuracy and statistics date grouping are separate concerns.

---

# 22. Accessibility

The application must support:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Accessible buttons
- Accessible dialogs
- Appropriate ARIA
- Screen-reader labels
- Sufficient contrast
- Reduced motion

Never rely only on color to communicate state.

Interactive controls must have clear accessible names.

---

# 23. Responsive Design

Support:

- Desktop
- Tablet
- Mobile

The timer must remain the primary focus on every screen size.

Desktop:

- Integrated task panel

Mobile:

- Task drawer/slide-over/bottom sheet

Controls should be comfortable for touch.

Avoid layouts that require horizontal scrolling.

---

# 24. Empty States

Use helpful, concise empty states.

Examples:

### No tasks

> Add a task to start organizing your focus sessions.

### No statistics

> Complete your first Pomodoro to start building your productivity history.

### No focus audio

> Choose a focus sound.

Do not show technical errors or stack traces to users.

Errors should explain what happened and, where possible, what the user can do.

---

# 25. SEO and Metadata

Implement basic launch-ready SEO:

- Meaningful page title
- Meta description
- Proper heading hierarchy
- Favicon
- Open Graph metadata
- Twitter/X metadata where appropriate
- Social preview image

Do not spend significant development time on advanced SEO.

---

# 26. Analytics

If analytics are added, keep them minimal and privacy-conscious.

Potential events:

- Timer started
- Pomodoro completed
- Task created
- Task completed
- Focus audio started
- Language changed
- Notifications enabled

Never send task names as analytics data.

---

# 27. Premium Architecture

Premium is **not part of the V1 launch**.

Do not implement payment infrastructure.

Do not artificially cripple the free version.

Future premium capabilities may include:

- Advanced historical statistics
- Advanced task management
- Priorities
- Deadlines
- Premium focus sounds
- Premium themes
- Additional timer visualizations
- Advanced customization
- Cloud sync/account features

Architecture should remain flexible enough to add these later.

Iranian payment gateways are a future concern.

Do not build them now.

---

# 28. V1 Non-Goals

Do NOT build:

- Full project management
- Complex task priorities
- Deadlines
- Team collaboration
- Social features
- Chat
- Calendar integrations
- Complex external music integrations
- Payment gateway
- Full subscription system
- Complicated profiles
- Large theme system
- AI productivity assistant
- Browser extension
- Native mobile apps
- Mandatory accounts

If a feature is not specified and is not required to support the architecture, do not add it.

---

# 29. Architecture Boundaries

Keep these systems independently replaceable:

```text
Timer Engine
    ↓
Timer State / Events
    ↓
UI Visualization

Tasks
    ↓
Task Repository

Sessions
    ↓
Session Repository
    ↓
Statistics

Localization
    ↓
Language + RTL/LTR + Numerals

Calendar
    ↓
Jalali/Gregorian

Focus Audio
    ↓
Audio Provider

Persistence
    ↓
Local Repository
    ↓
Future Cloud Repository
```

Do not tightly couple the timer to:

- React components
- Timer visualization
- localStorage
- Audio
- Statistics UI

The timer should emit domain-level events that other systems can react to.

---

# 30. Testing Requirements

Prioritize business-logic tests over superficial snapshots.

## Timer tests

Test:

- Start
- Pause
- Resume
- Reset
- Skip
- Completion
- Automatic transition
- Long break after correct number of completed work sessions
- Background timing behavior
- Restoring idle and paused state
- Restoring a running timer as paused, with the remaining time as of the last save
- Restoring a timer whose saved remaining time is zero
- Independent timers in multiple tabs
- Cycle counter derived from today's sessions

## Statistics tests

Test:

- Completed Pomodoros
- Focus duration
- Daily grouping
- Weekly grouping
- Streaks
- Goals

## Calendar tests

Test:

- Jalali conversion
- Gregorian conversion
- Calendar boundaries
- Secondary calendar
- Local date handling

## Localization tests

Test:

- Persian
- English
- RTL
- LTR
- Persian numerals
- Latin numerals

---

# 31. Development Milestones

The detailed, session-sized breakdown, including build order and acceptance criteria, is in `docs/MILESTONES.md`. Where it differs from the list below, `docs/MILESTONES.md` governs.

Implement incrementally.

Keep the app runnable after each major milestone.

## Milestone 1 — Foundation

Build:

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- Project structure
- Routing
- Design tokens
- Basic dashboard layout
- Sidebar navigation
- Theme system
- Localization architecture

Do not implement the complete product yet.

---

## Milestone 2 — Timer

Build:

- Timer engine
- Timestamp-based timing
- Digital visualization
- Start
- Pause
- Resume
- Reset
- Skip
- Session transitions
- Automatic next-session behavior
- Long-break logic
- Timer state persistence and restoration across reload/close
- Completion events
- Completion sound
- Congratulatory toast
- Browser notification integration

Test timer business logic.

---

## Milestone 3 — Tasks

Build:

- Task panel
- Add task
- Edit task
- Delete task
- Select task
- Switch task
- Complete task / mark incomplete
- Associate Pomodoros with selected tasks
- Desktop collapsible panel
- Mobile drawer/slide-over/bottom sheet

---

## Milestone 4 — Statistics

Build:

- Daily statistics
- Weekly statistics
- Long-term statistics
- Daily goals
- Streaks
- Activity visualization
- Task completion statistics

---

## Milestone 5 — Localization and Calendar

Build:

- Persian
- English
- RTL
- LTR
- Persian numerals
- Latin numerals
- Jalali
- Gregorian
- Secondary calendar

Verify all existing screens in both directions.

---

## Milestone 6 — Focus Audio

Build:

- Audio abstraction
- Initial focus sounds
- Play/pause
- Volume
- Enabled/disabled preference
- Responsive audio controls

---

## Milestone 7 — Settings

Implement the complete Settings section.

---

## Milestone 8 — Polish

Review:

- Mobile
- Tablet
- Desktop
- Accessibility
- Loading states
- Empty states
- Error states
- Animations
- Reduced motion
- Performance
- Notifications
- Theme behavior
- RTL
- Metadata
- SEO
- Open Graph
- Favicon

---

## Milestone 9 — Production Readiness

Before launch verify:

- Production build succeeds
- No obvious console errors
- No broken routes
- Timer remains accurate in background
- Timer transitions correctly
- Statistics are correct
- Local persistence works
- Persian/English work
- RTL/LTR work
- Numerals work
- Calendars work
- Mobile layouts work
- Accessibility basics work
- Notifications behave correctly
- Audio behaves correctly
- No unnecessary dependencies
- Environment variables are documented
- Deployment instructions exist

---

# 32. Development Process

The development workflow and Cursor-specific instructions are maintained separately in the repository's AGENTS.md.

AGENTS.md is the operational guide for working on this project. It should be read before making changes.

docs/PRD.md is the source of truth for product requirements, feature scope, architecture, UX decisions, and acceptance criteria.

When implementing a feature:

    1. Read the relevant section of docs/PRD.md.

    2. Follow the development rules in AGENTS.md.

    3. Inspect the existing implementation before changing it.

    4. Implement the smallest coherent change.

    5. Keep the application runnable.

    6. Run relevant tests and build checks.

    7. Do not add features that are outside the specification unless explicitly requested.

    8. Document important architectural decisions when necessary.

If AGENTS.md and PRD.md appear to conflict, treat the product requirements in PRD.md as the source of truth and resolve the conflict explicitly rather than guessing.

---

# 33. Definition of Done

A new user must be able to:

1. Open the application.
2. Immediately start a 25-minute Pomodoro.
3. Add a task (and edit, delete, complete or reopen tasks).
4. Select the task.
5. Start focusing.
6. Pause.
7. Resume.
8. Reload the tab (or reopen a closed tab) and find the timer paused where it was.
9. Reset with confirmation.
10. Skip.
11. Complete a Pomodoro.
12. See a congratulatory notification/toast.
13. Automatically enter the next session.
14. Receive an optional completion sound.
15. Receive an optional browser notification.
16. See statistics update.
17. See daily goal progress.
18. See streak information.
19. Use focus audio.
20. Switch between Persian and English.
21. Experience correct RTL/LTR layouts.
22. Switch Persian/Latin numerals.
23. Switch Jalali/Gregorian calendars.
24. Enable a secondary calendar.
25. Switch light/dark mode.
26. Switch digital/analog timer visualization.
27. Use the application comfortably on mobile and desktop.
28. Use the application without creating an account.

---

# 34. Final Product Principle

For every implementation decision, ask:

> Does this make the user's focused-work experience simpler, clearer, and better?

The timer is the heart of the product.

Tasks, statistics, goals, audio, customization, and localization should support the timer rather than compete with it.

Build a real polished productivity product, not a demo.

Ship the simplest excellent version first.
