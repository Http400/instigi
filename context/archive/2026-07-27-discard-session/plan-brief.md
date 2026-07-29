# Discard an In-Progress Workout Session — Plan Brief

> Full plan: `context/changes/discard-session/plan.md`

## What & Why

Let users abandon an in-progress workout session and permanently delete it
(roadmap S-05, PRD FR-007). Today a started session can only be finished (which
requires ≥1 set) or left open forever — there's no clean way to throw away a
session started by mistake.

## Starting Point

The training-service has create/read/update/finish for sessions but no delete
path. `finishSession` already implements the owner-check + finished-guard shape,
and both child relations cascade on delete, so removal is a one-liner. The web
app's SessionPage already hosts a "Finish workout" button with a confirm dialog
and success navigation — the exact pattern discard reuses.

## Desired End State

From an in-progress session page, "Discard workout" → confirm dialog → the
session and all its exercises/sets are deleted server-side and the user lands on
`/workouts` with no active session. Discarding a finished session is rejected
(409). Discarded sessions never appear in history.

## Key Decisions

1. **Route**: `DELETE /api/sessions/:id` (true REST deletion, no path collision).
2. **Guard**: reject a finished session with 409 `SESSION_ALREADY_FINISHED`
   (protects the S-04 history loop).
3. **Contents**: discard works regardless of contents (empty sessions included).
4. **Placement**: only inside SessionPage — no WorkoutsPage entry point.
5. **UX**: low-emphasis error-colored button + destructive confirmation dialog
   (mirrors the finish confirm pattern).

## Phases

1. **Backend** — `discardSession` controller + `DELETE /:id` route + supertest
   coverage. Cascade delete handles child cleanup.
2. **Data layer** — `discardSession` RTK mutation invalidating `ActiveSession` +
   `Session` id (not `History`).
3. **Discard UI** — button + confirm dialog on SessionPage, navigate to
   `/workouts` on success; extend SessionPage tests.

## Risk

Low. Every layer mirrors an existing, tested counterpart (finish flow), and the
only destructive operation is guarded by a confirmation dialog and a
finished-session check.
