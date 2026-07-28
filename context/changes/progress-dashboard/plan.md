# Plan: Progress dashboard with total workouts and recent activity (S-07)

## End State

A signed-in user can open a **Progress** dashboard at `/progress` (via the
sidebar/bottom-nav "Progress" item, previously disabled) that shows:

1. **Headline stat cards** — total workouts completed, workouts in the last 7
   days, and total exercises logged (Σ `exerciseCount`).
2. **Recent activity** — a compact list of the 5 most recent finished workouts
   (title · finished date · exercise count), each linking to its read-only
   detail (`/workouts/:id`), plus a "View all history" link to
   `/workouts/history`.
3. **Empty state** — when the user has no finished workouts, a friendly "No
   workouts yet" prompt with a "Start a workout" button linking to `/workouts`.

The page reuses `useGetHistoryQuery()` (`SessionSummary[]`) — **frontend-only**,
no API / `@instigi/types` / training-service change. Loading and error states
mirror the HistoryPage convention (spinner; error with Retry).

## Approach

- **Phase 1** extracts all derivation into a pure helper
  `apps/web-app/src/features/sessions/progressStats.ts` so the date-window math
  (last 7 days) is deterministically unit-testable via an injected `now`.
- **Phase 2** builds the presentational `ProgressPage`, adds the `/progress`
  route inside `AppLayout`, and enables the existing "Progress" nav item.

The existing `/dashboard` `DashboardPage` (a post-login placeholder outside
`AppLayout`) is intentionally left untouched — it is a different concept.

## Files

### `apps/web-app/src/features/sessions/progressStats.ts` (new — Phase 1)

Pure module. No React, no imports beyond `@instigi/types`.

```ts
import type { SessionSummary } from '@instigi/types';

export interface ProgressStats {
  totalWorkouts: number;
  last7Days: number;
  totalExercises: number;
  recent: SessionSummary[]; // up to 5, most-recent first
}

export function computeProgressStats(
  history: SessionSummary[],
  now: Date
): ProgressStats;
```

- `totalWorkouts = history.length`.
- `last7Days` = count of workouts whose `endedAt` is within the 7×24h window
  ending at `now` (i.e. `now - endedAt >= 0` and `< 7 days`). Guard against
  future-dated / unparseable `endedAt` (ignore NaN; a negative diff — future —
  is not counted).
- `totalExercises = Σ exerciseCount`.
- `recent` = history sorted by `endedAt` descending, sliced to the first 5. Do
  NOT assume the input is pre-sorted — sort defensively (copy first; never
  mutate the input array).
- Respects `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`.

### `apps/web-app/src/features/sessions/progressStats.test.ts` (new — Phase 1)

Vitest unit tests with a fixed `now`:
- totals: `totalWorkouts`, `totalExercises` sum correctly.
- `last7Days` counts only workouts inside the window; excludes an 8-day-old one
  and a future-dated one; includes a boundary case just inside 7 days.
- `recent` is sorted most-recent-first and capped at 5 even with 6+ inputs; does
  not mutate the input array.
- empty input → all zeros + empty `recent`.

### `apps/web-app/src/pages/ProgressPage.tsx` (new — Phase 2)

Presentational page (top-level route `/progress`, so it lives at `pages/`
alongside `WorkoutsPage.tsx` / `ExercisesPage.tsx`; the `pages/workouts/` folder
is reserved for `/workouts/*` sub-pages).

- `const { data: history, isLoading, isError, refetch } = useGetHistoryQuery();`
- Loading → centered `CircularProgress` (HistoryPage pattern).
- Error → `ErrorOutlineIcon` + message + Retry button calling `refetch()`.
- Empty (`history.length === 0`) → "No workouts yet" + prompt + a "Start a
  workout" `Button` → `navigate('/workouts')`.
- Otherwise: `const stats = computeProgressStats(history, new Date());`
  - **Stat cards** row: three cards (Total workouts / Last 7 days / Total
    exercises) using MUI `Card`/`Paper` + `Typography` (big number + label).
  - **Recent activity**: heading + a `List` of `stats.recent` rows
    (`ListItemButton` → `navigate('/workouts/' + w.id)`), each showing
    `title || 'Untitled workout'` and `formatFinishedAt(endedAt) · N exercise(s)`
    (reuse the HistoryPage date/plural formatting shape).
  - A "View all history" text button/link → `navigate('/workouts/history')`.
- Title heading "Progress" (`Typography variant="h4"`), consistent with
  HistoryPage's header treatment.

### `apps/web-app/src/pages/ProgressPage.test.tsx` (new — Phase 2)

Vitest + Testing Library, mocking `react-router` (`useNavigate`) and
`useGetHistoryQuery` (HistoryPage.test pattern):
- renders stat card numbers for a known history set.
- renders up to 5 recent rows; clicking a row navigates to `/workouts/:id`.
- "View all history" navigates to `/workouts/history`.
- empty state shows the prompt; "Start a workout" navigates to `/workouts`.
- loading and error (Retry calls refetch) states render.

### `apps/web-app/src/router.tsx` (Phase 2)

- Import `ProgressPage`.
- Add `{ path: 'progress', Component: ProgressPage }` inside the `AppLayout`
  children block (alongside `workouts`, `workouts/history`).

### `apps/web-app/src/layouts/AppLayout.tsx` (Phase 2)

- In `NAV_ITEMS`, change the Progress entry from `disabled: true` to
  `{ label: 'Progress', icon: <ShowChartIcon />, to: '/progress' }`.
- Leave the mobile `BOTTOM_NAV_ITEMS` as-is (Progress is not one of its four
  slots; it stays reachable via the "More" affordance later). No other nav
  change. The existing `resolveActiveTo` logic will light up Progress correctly.

## Success Criteria

#### Automated
- [ ] `pnpm --filter @instigi/web-app test` passes (new progressStats +
  ProgressPage suites green; existing suites unaffected).
- [ ] `pnpm lint && pnpm typecheck` clean (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`).

#### Manual
- [ ] The "Progress" sidebar item is enabled and navigates to `/progress`; it
  highlights as active when on that route.
- [ ] With finished workouts: total / last-7-days / total-exercises cards show
  correct numbers; the recent list shows ≤5 workouts, each opening its detail;
  "View all history" opens `/workouts/history`.
- [ ] With no finished workouts: the empty state renders and "Start a workout"
  opens `/workouts`.

## What we're NOT doing

- No backend / API / `@instigi/types` change (all data is in `getHistory`).
- Not touching the existing `/dashboard` placeholder page.
- No charts/graphs, no date-range selector, no streaks — scope is total count +
  a fixed 7-day recency + total exercises + a recent list (nice-to-have slice).
- Not adding Progress to the mobile bottom nav's four primary slots.

## Progress

### Phase 1: Progress stats helper

#### Automated
- [x] 1.1 Create `progressStats.ts` (`computeProgressStats(history, now)` → totals + last7Days + recent≤5, defensive sort, window/NaN guards)
- [x] 1.2 Add `progressStats.test.ts` (totals, 7-day window incl. boundary/future, recent cap+sort+no-mutate, empty)
- [x] 1.3 `pnpm --filter @instigi/web-app test` green
- [x] 1.4 `pnpm lint && pnpm typecheck` clean

### Phase 2: Dashboard page, route, and nav

#### Automated
- [ ] 2.1 Create `ProgressPage.tsx` (stat cards + recent-5 list + empty/loading/error states)
- [ ] 2.2 Add `/progress` route in `router.tsx`
- [ ] 2.3 Enable the "Progress" nav item in `AppLayout.tsx` (`to: '/progress'`)
- [ ] 2.4 Add `ProgressPage.test.tsx` (cards, recent nav, view-all, empty+start, loading, error)
- [ ] 2.5 `pnpm --filter @instigi/web-app test` green
- [ ] 2.6 `pnpm lint && pnpm typecheck` clean

#### Manual
- [ ] 2.7 "Progress" nav item is enabled, navigates to `/progress`, highlights when active
- [ ] 2.8 Stat cards + recent list render correct data; rows open detail; "View all history" works
- [ ] 2.9 Empty state renders with a working "Start a workout" link
