# Workout History List — Plan Brief

> Full plan: `context/changes/workout-history-list/plan.md`

## What & Why

Add a reverse-chronological list of past **finished** workouts (name, finish date, exercise count) so a completed workout is visible in history immediately after saving. This is roadmap slice **S-04**, which closes the north-star logging loop (S-02 start → S-03 log/finish → S-04 see it in history) and satisfies PRD FR-010 (must-have) plus the US-01 acceptance criterion "completed workout appears in the history list immediately after saving."

## Starting Point

The training-service lists only the *active* session (`GET /active`, `endedAt IS NULL`) and serves any single session by id; there is no endpoint that lists finished workouts. The web app's Workouts page shows only the active session, and there is no History route or nav entry. The read-only view of a finished session already exists at `/workouts/:sessionId` (built in S-03).

## Desired End State

A signed-in user has a "History" nav entry and a "View history" link on the Workouts page. History shows finished workouts newest-first with name, finish date, and exercise count; clicking a row opens that workout read-only. Finishing a workout makes it appear at the top of history with no manual refresh. Empty and error states are handled gracefully.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| List payload | New `SessionSummary` DTO (`id`, `title`, `endedAt`, `exerciseCount`) | Keeps the list query cheap; avoids trafficking full nested sessions | Plan |
| Endpoint | `GET /api/sessions/history` | Distinct literal path, unambiguous vs the `:id` param route | Plan |
| UI placement | Separate `/workouts/history` route + nav entry + Workouts-page link | First-class destination; keeps the Workouts landing focused on the active session | Plan |
| Volume handling | Return all finished workouts, no pagination | Dataset is small at MVP scale; simplest correct behavior | Plan |
| Row interaction | Rows navigate to read-only `/workouts/:id` | Reuses the S-03 read-only view; no detail-view work (FR-011 stays out of scope) | Plan |

## Scope

**In scope:**
- `SessionSummary` shared type
- `GET /api/sessions/history` (finished-only, `endedAt DESC`, `exerciseCount` via Prisma `_count`) + tests
- `getHistory` RTK Query hook + `History` cache tag; `finishSession` invalidates it
- `HistoryPage`, `/workouts/history` route, History nav entry, Workouts-page "View history" link + tests

**Out of scope:**
- Dedicated workout detail view (FR-011 / S-06)
- Pagination, filtering, search, sorting controls
- Aggregate stats / dashboard (S-07)
- Any schema/migration change; any active-session or set-logging change

## Architecture / Approach

Layered exactly like S-03: shared type → backend endpoint + tests → web data layer → web UI. `listHistory` filters `endedAt: { not: null }`, orders by `endedAt desc`, and uses `_count` for the exercise count. The client adds a `History` cache tag invalidated by `finishSession` so the "appears immediately" criterion holds. `HistoryPage` reuses `WorkoutsPage`'s loading/error/empty patterns and links rows to the existing read-only session view.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Backend history endpoint | `SessionSummary` type + `GET /history` (finished, newest-first, count) + tests | Route ordering vs `/:id`; correct finished-only filter |
| 2. Web-app data layer | `getHistory` query + `History` tag; finish invalidation | Cache invalidation must fire on finish for immediate appearance |
| 3. History UI + navigation | `HistoryPage`, route, nav entry, Workouts link + tests | `isActive` nav highlighting collision between `/workouts` and `/workouts/history` |

**Prerequisites:** S-03 (`log-sets-finish-workout`) implemented ✓; `instigi-pg` running for manual checks.
**Estimated effort:** ~1 session across 3 small phases.

## Open Risks & Assumptions

- Assumes finished sessions are identified solely by `endedAt != null` (consistent with S-03's finish logic).
- Nav-active highlighting: `/workouts` currently matches via `startsWith`, so `/workouts/history` would also mark Workouts active — Phase 3 must make the two mutually exclusive.
- No pagination assumes small per-user history; revisit if volumes grow.

## Success Criteria (Summary)

- Finishing a workout makes it appear at the top of `/workouts/history` immediately, with correct name, finish date, and exercise count.
- Clicking a history row opens the read-only session with sets intact.
- Empty and error states render gracefully; full monorepo `lint && typecheck && test && build` is green.
