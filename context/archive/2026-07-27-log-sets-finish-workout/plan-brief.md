# Log Sets & Finish Workout — Plan Brief

> Full plan: `context/changes/log-sets-finish-workout/plan.md`

## What & Why

Roadmap slice S-03, the north-star loop: let a user log **sets** for each
exercise in an active session — capturing exactly the metrics that exercise is
configured for — then **finish** the session to save it. This is the first slice
that produces durable workout results; S-01/S-02 built the scaffolding for it.

## Starting Point

S-02 delivered active sessions with snapshotted exercises: each `SessionExercise`
already carries its `metrics` (with `required?`), `allowedEntryTypes`, and
`defaultEntryType`. `WorkoutSession.endedAt` exists but nothing ever sets it, so
a session can be started but never finished. There is no logged-set entity yet.

## Desired End State

Per exercise, the user appends sets via metric-aware inputs (reps/load/distance
as numbers, duration as mm:ss), edits or deletes them, and presses "Finish
workout" (enabled once ≥1 set exists). Finishing stamps `endedAt`, locks the
session read-only, and returns to the Workouts landing. All set data round-trips
across reloads.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Entry storage | New `ExerciseEntry` table, `values` as JSON | Matches data-model.md exactly; flexible per-metric shape | Plan |
| Set completeness | Require `required:true` metrics present & positive; optionals may be blank | Data-driven from the snapshot — the FR-005 core rule | Plan |
| Finish "not empty" | Require ≥1 exercise AND ≥1 set total | Satisfies PRD acceptance without over-constraining | Plan |
| Post-finish state | Session read-only (terminal) | Simple, matches "saved workout" mental model | Plan |
| Entry type | Default to exercise `defaultEntryType`, stored, no switcher | Most exercises are single-mode; avoids UI scope | Plan |
| Set operations | Full CRUD (add/edit/delete) | Real logging needs corrections mid-workout | Plan |
| Logging UI location | Inline per-exercise list on SessionPage | Fewest navigation hops; keeps context | Plan |
| Duration UX | mm:ss text, parsed to seconds | Human-friendly; wire stays integer seconds | Plan |
| Units | Raw base units + static label (kg, m, mm:ss) | No conversion complexity yet | Plan |
| Finish action | Gated button + confirm dialog | Prevents accidental/empty saves | Plan |
| Post-finish nav | Workouts landing | No active session → shows "start new" | Plan |
| Testing | Match S-02 (supertest + component tests) | Consistent, proven surface | Plan |

## Scope

**In scope:** `ExerciseEntry` type + table + migration; set CRUD endpoints with
completeness validation; finish endpoint with "not empty" + terminal lock;
nested entries in session reads; RTK Query mutations; inline set-logging UI with
mm:ss handling; gated Finish + confirm; tests across service and web-app.

**Out of scope:** entry-type switcher, unit conversion / user preferences,
`rpe`/`calories`, history-list UI (S-04), re-open/un-finish, per-set notes UI,
`isCompleted` toggle, discard-session (FR-007).

## Architecture / Approach

Bottom-up over five layers: shared types → Prisma model + migration →
training-service endpoints (where the domain rules live and are authoritative) →
RTK Query data layer → SessionPage UI. Server enforces completeness and
"not empty"; the UI mirrors them as disabled affordances. `metricCatalog` drives
which inputs render and how (`duration` → mm:ss); base units stored internally.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared types | `ExerciseEntry` + request DTOs; `entries` on SessionExercise | Getting the value-shape contract right upfront |
| 2. Prisma model + migration | `exercise_entries` table, cascade FK | Dev DB must be running to migrate |
| 3. Service endpoints + tests | Set CRUD + finish, validation, read-only lock | Data-driven completeness rule correctness |
| 4. Web-app data layer | RTK Query set + finish mutations | Tag invalidation keeping nested entries fresh |
| 5. Set-logging + finish UI | Inline logging, mm:ss inputs, gated Finish | Dynamic per-metric form + render-time state-sync |

**Prerequisites:** S-02 done ✓. Dev Postgres running (`./scripts/dev-postgres.sh`)
for Phase 2 migration + manual verification.
**Estimated effort:** ~3–4 sessions across 5 phases.

## Open Risks & Assumptions

- The completeness rule must read the metric snapshot, not hardcode exercise
  rules — pull-up (reps required, load optional) is the case that proves it.
- mm:ss parsing is UI-only; the server contract is integer seconds. A leak of
  mm:ss to the wire would corrupt values.
- The read-only-after-finish lock must gate all three set-write handlers before
  mutation, or a finished session could be silently edited.

## Success Criteria (Summary)

- A user can log per-exercise sets whose inputs match each exercise's metrics,
  then finish and save a non-empty workout.
- A finished session persists `endedAt` and its full set data across reloads and
  is read-only to further edits.
- Empty finishes and writes to finished sessions are rejected by the server.
