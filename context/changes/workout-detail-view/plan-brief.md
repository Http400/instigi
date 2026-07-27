# Plan Brief: workout-detail-view (S-06)

**Scope:** Light, frontend-only enhancement of the existing read-only
`SessionPage` (`/workouts/:id` when `endedAt !== null`). No API / types /
training-service change — all data is already in the `getSession` payload.

**Phases:** 1 (single).

**Changes:**
- New `apps/web-app/src/pages/workouts/WorkoutSummary.tsx` — presentational:
  finished date (Intl format mirroring HistoryPage) + `N exercises · M sets ·
  <duration>` row (duration = `endedAt − startedAt`, formatted `Xh Ym` / `Ym` /
  `<1m`). Plural-aware, null-safe.
- `SessionPage.tsx` read-only branch: add top-left `Back to history` text button
  (`navigate('/workouts/history')`) + replace the "finished and saved" success
  Alert with `<WorkoutSummary />`.
- New `WorkoutSummary.test.tsx` + extended `SessionPage.test.tsx`.

**Not doing:** separate detail page/route, total volume in summary, any change to
the active-editing view / API / types.

**Verify:** `pnpm --filter @instigi/web-app test`, `pnpm lint && pnpm typecheck`;
manual: back button navigates, date+summary render, active session unchanged.

**Closeout:** flip roadmap S-06 → `done` (table row + detail `**Status:**`).
