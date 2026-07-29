# Plan Brief: progress-dashboard (S-07)

**Scope:** Frontend-only progress dashboard at `/progress` (FR-012,
nice-to-have). Reuses `useGetHistoryQuery()` (`SessionSummary[]`) — no API /
types / training-service change.

**Phases:** 2.

**Phase 1 — Stats helper:**
- New `apps/web-app/src/features/sessions/progressStats.ts`:
  `computeProgressStats(history, now)` → `{ totalWorkouts, last7Days,
  totalExercises, recent }` (recent = ≤5 most-recent, defensively sorted).
  Window/NaN/future-date guards, no input mutation.
- New `progressStats.test.ts` (totals, 7-day window incl. boundary + future,
  recent cap/sort/no-mutate, empty).

**Phase 2 — Dashboard UI + nav:**
- New `apps/web-app/src/pages/workouts/ProgressPage.tsx`: three stat cards
  (total / last 7 days / total exercises), recent-5 list linking to
  `/workouts/:id`, "View all history" → `/workouts/history`, empty state with
  "Start a workout" → `/workouts`, loading/error (Retry) states.
- `router.tsx`: add `{ path: 'progress', Component: ProgressPage }` under
  `AppLayout`.
- `AppLayout.tsx`: enable the existing disabled "Progress" nav item
  (`to: '/progress'`).
- New `ProgressPage.test.tsx`.

**Not doing:** backend change, touching `/dashboard` placeholder, charts /
date-range / streaks, adding Progress to mobile bottom-nav primary slots.

**Verify:** `pnpm --filter @instigi/web-app test`, `pnpm lint && pnpm
typecheck`; manual: nav enabled + active, cards/recent/detail links, empty +
start-workout link.

**Closeout:** flip roadmap S-07 → `done` (table row + detail `**Status:**`).
This is the last remaining roadmap slice.
