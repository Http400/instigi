# Start a Session & Add Exercises (S-02) — Plan Brief

> Full plan: `context/changes/start-session-add-exercises/plan.md`

## What & Why

Let a signed-in user start a single active workout session (title editable,
defaulting to today's date) and add exercises to it from the predefined library,
removing any added by mistake. This is the second slice of the core logging loop
(FR-003 + FR-004, US-01) — you can't log sets against exercises you can't first
assemble into a session.

## Starting Point

`training-service` today serves only `GET /api/exercises` (browse) and has just
one Prisma model (`ExerciseDefinition`). The web app has the library browse
(`exercisesApi`), the reauth base-query factory, the store-slice pattern, and an
`AppLayout` whose **Workouts** nav is disabled. The data model fully specifies the
session tables; none are built.

## Desired End State

From the Workouts nav, a user with no active session sees "Start workout";
starting creates a session and lands them on `/workouts/:sessionId`, where they
edit the title, add exercises via a dialog that reuses the library browse
(duplicates allowed, ordered), and remove mistakes. Re-opening Workouts resumes
the same active session; a second concurrent session is prevented. The server is
the source of truth; the UI reads via RTK Query and refetches on mutation.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Active-session model | One active at a time (`endedAt IS NULL`); create 409s if one exists | Simplest coherent MVP model | Plan |
| Session start | Explicit "Start workout" creates the session first | Predictable state; no accidental sessions | Plan |
| Exercise storage | Snapshot definition at add-time; `exerciseDefinitionId` soft ref | Mandated by data-model; keeps history stable | Plan |
| Duplicates | Allowed, appended with incrementing `position` | Matches real workouts (multiple entries) | Plan |
| Remove exercise | In scope (DELETE) | Adding is error-prone without undo | Plan |
| Migration scope | `workout_sessions` + `session_exercises` only | `exercise_entries` belongs to S-03 | Plan |
| Frontend state | Server source of truth via new `sessionsApi` (tag invalidation) | No client/server drift | Plan |
| Add-exercise UX | Modal reusing library browse | Reuses S-01 browse; keeps user in context | Plan |
| Routing | Workouts nav → `/workouts`; active at `/workouts/:sessionId` | Clear resume + shareable session URL | Plan |
| Title & discard | Editable title default today's date; no discard | Discard (FR-007) is nice-to-have, deferred | Plan |
| Testing | Backend supertest + web-app component tests (mock hooks) | Matches existing harness | Plan |

## Scope

**In scope:** session create/get-active/get-by-id/update-title/add-exercise/
remove-exercise endpoints; two Prisma tables; `sessionsApi` slice; Workouts +
active-session pages; add-exercise dialog; tests both sides.

**Out of scope:** set logging & metric capture (FR-005), finish/save (FR-006),
history views, discard (FR-007), exercise reordering, custom exercise definitions,
`exercise_entries` table.

## Architecture / Approach

Back-to-front in five thin phases: shared types → Prisma models/migration →
`/api/sessions` endpoints (auth + ownership + Zod + snapshot) → `sessionsApi` RTK
Query slice → Workouts UI (nav + routes + pages + dialog). Server holds all
session state; frontend keeps none beyond RTK cache, refetching via cache-tag
invalidation on each mutation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared contract | Session DTOs + request types in `@instigi/types` | Getting the wire shape right (ISO-string dates) |
| 2. Data model | `workout_sessions` + `session_exercises` migration | Snapshot columns + cascade FK correctness |
| 3. Endpoints | 6 session routes + supertest | Ownership scoping + single-active 409 |
| 4. Data layer | `sessionsApi` slice + store wiring | Cache-tag invalidation correctness |
| 5. Workouts UI | Nav, pages, add-exercise dialog + tests | Reusing browse in a dialog; state transitions |

**Prerequisites:** S-01 (browse) and F-01 (service) — both done. A running,
seeded training-service for manual verification.
**Estimated effort:** ~3-4 sessions across 5 phases.

## Open Risks & Assumptions

- Single-active enforcement is a read-then-write check (no advisory lock) — fine
  under the MVP's low-concurrency, one-user-per-account assumption.
- Reusing `ExercisesToolbar` in the dialog assumes it stays presentation-only
  (it's already controlled) — no shared-state coupling.
- Timestamps are ISO strings in DTOs to keep RTK cache serializable (a
  deliberate divergence from the `User` type's `Date` fields).

## Success Criteria (Summary)

- A user can start a session, add/remove exercises from the library, and edit the title.
- The active session persists across reloads and resumes from the Workouts nav; a second concurrent session is blocked.
- No regressions in auth or the exercises page; full monorepo checks green.
