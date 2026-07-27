# Plan: Enhance the read-only past-workout detail view (S-06)

## End State

When a user opens a finished workout from History (`/workouts/history` →
`/workouts/:id`), the read-only `SessionPage` gains three light enhancements on
top of the detail it already renders:

1. **Back to history** — a top-left text button (ArrowBack icon) that navigates
   to `/workouts/history`.
2. **Finished date** — the workout's completion date, shown as a subtitle under
   the title (same `Intl.DateTimeFormat` shape HistoryPage uses).
3. **A compact summary** — a one-line row of `N exercises · M sets · <duration>`,
   where duration is `endedAt − startedAt` rendered human-readably (e.g. `1h 23m`,
   `45m`, `<1m`).

The now-redundant "This workout is finished and saved" success Alert is replaced
by this metadata. The active-editing view (`endedAt === null`) is untouched.

This is **frontend-only**: everything needed is already in the `WorkoutSession`
payload returned by `getSession` (`startedAt`, `endedAt`, `exercises[]`,
`exercises[].entries[]`). No `@instigi/types`, API, or training-service change.

## Approach

Extract the metadata into a small presentational component
`apps/web-app/src/pages/workouts/WorkoutSummary.tsx` (mirrors the folder's
component-per-concern pattern: `ExerciseSetList`, `AddExerciseDialog`). It takes
a finished `WorkoutSession` and renders the finished-date subtitle plus the
`exercises · sets · duration` row.

`SessionPage`'s read-only branch then:
- renders a top-left `Back to history` button (read-only only), and
- replaces the success Alert with `<WorkoutSummary session={session} />`.

## Files

### `apps/web-app/src/pages/workouts/WorkoutSummary.tsx` (new)

Presentational component. Props: `{ session: WorkoutSession }`.

- `formatFinishedAt(iso)` — same `Intl.DateTimeFormat('en-US', { weekday: 'short',
  month: 'short', day: 'numeric', year: 'numeric' })` shape as HistoryPage.
- `formatSessionDuration(startedIso, endedIso)` — diff in whole minutes; render
  `Xh Ym` when ≥ 60 min, `Ym` when 1–59, `<1m` when 0. Guard against negative /
  invalid diffs (clamp to 0 → `<1m`).
- Derives `totalExercises = session.exercises.length` and
  `totalSets = session.exercises.reduce((s, e) => s + e.entries.length, 0)`.
- Renders (read-only context assumed — caller only mounts this when finished):
  - a `Typography variant="body2" color="text.secondary"` finished-date line
    (`Finished {date}`), and
  - a summary line: `{n} exercise(s) · {m} set(s) · {duration}` with correct
    singular/plural for exercise/set.
- Since `endedAt` is `string | null`, defensively no-op (`return null`) when
  `session.endedAt === null` so the component is safe even if misused.

### `apps/web-app/src/pages/workouts/SessionPage.tsx`

- Import `ArrowBackIcon` from `@mui/icons-material/ArrowBack` and `WorkoutSummary`.
- In the read-only branch, above the title, render a left-aligned
  `Button variant="text" startIcon={<ArrowBackIcon />}` labelled `Back to history`
  that calls `navigate('/workouts/history')`. Guard with `{readOnly && ( … )}`.
- Replace the existing `{readOnly && (<Alert severity="success">This workout is
  finished and saved.</Alert>)}` block with
  `{readOnly && <WorkoutSummary session={session} />}`.
- No other structural change (finish/discard controls, error alerts, exercise
  list all stay as-is).

### `apps/web-app/src/pages/workouts/WorkoutSummary.test.tsx` (new)

Vitest + Testing Library (no router/api mocks needed — pure presentational):
- renders the finished date, exercise count, set count, and a formatted duration
  for a finished session with multiple exercises and sets;
- correct singular/plural (`1 exercise`, `1 set`);
- `Xh Ym` formatting for a ≥ 1h duration and `Ym` for a sub-hour duration;
- returns nothing when `endedAt === null` (defensive).

### `apps/web-app/src/pages/workouts/SessionPage.test.tsx`

- Add a test: when the session is finished, a `Back to history` button is present
  and clicking it navigates to `/workouts/history`.
- Add a test: when finished, the `WorkoutSummary` metadata is shown (assert the
  finished-date / summary text appears) and the old "finished and saved" Alert
  text is gone.
- Extend the existing "hides mutating controls when finished" expectations only if
  needed (no removal of existing assertions).

## Success Criteria

#### Automated
- [ ] `pnpm --filter @instigi/web-app test` passes (new WorkoutSummary suite +
  updated SessionPage suite green).
- [ ] `pnpm lint && pnpm typecheck` clean (respects `noUncheckedIndexedAccess` /
  `exactOptionalPropertyTypes`).

#### Manual
- [ ] Open a finished workout from History: a `Back to history` button appears
  top-left and returns to `/workouts/history`.
- [ ] The finished date and a `N exercises · M sets · <duration>` summary render
  under the title; the old "finished and saved" alert is gone.
- [ ] An active (unfinished) session is visually unchanged — no back button, no
  summary, editing controls intact.

## What we're NOT doing

- Not building a separate detail page or route.
- Not adding total volume to the summary (ambiguous across cardio/mobility/
  duration metrics).
- Not touching the active-editing view, the API, `@instigi/types`, or the
  training-service.

## Progress

### Phase 1: Read-only detail enhancement

#### Automated
- [x] 1.1 Create `WorkoutSummary.tsx` (finished-date + exercises·sets·duration, plural-aware, null-safe) — 7631dc8
- [x] 1.2 Wire `SessionPage` read-only branch: add `Back to history` button + replace success Alert with `WorkoutSummary` — 7631dc8
- [x] 1.3 Add `WorkoutSummary.test.tsx` (date, counts, duration formats, plural, null-safe) — 7631dc8
- [x] 1.4 Extend `SessionPage.test.tsx` (back-to-history nav + summary shown when finished) — 7631dc8
- [x] 1.5 `pnpm --filter @instigi/web-app test` green — 7631dc8
- [x] 1.6 `pnpm lint && pnpm typecheck` clean — 7631dc8

#### Manual
- [x] 1.7 Back-to-history button navigates to `/workouts/history` from a finished workout — 7631dc8
- [x] 1.8 Finished date + summary render; old success alert gone — 7631dc8
- [x] 1.9 Active session visually unchanged (no back button / summary; editing intact) — 7631dc8
