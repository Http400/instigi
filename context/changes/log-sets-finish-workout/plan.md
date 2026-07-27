# Log Sets & Finish Workout Implementation Plan

## Overview

Implement roadmap slice S-03 — the north-star loop. Add a persistent
**ExerciseEntry** (a logged set/lap/interval/single) beneath each session
exercise, capturing exactly the metrics that exercise is configured for, then a
**finish** action that saves the session and enforces "not empty". This is the
first slice that produces durable workout results; everything in S-01/S-02 was
scaffolding for this moment.

## Current State Analysis

- **Data model already anticipates this.** `context/foundation/data-model.md`
  fully specifies `ExerciseEntry` (`id, sessionExerciseId, position, entryType,
  values: Partial<Record<MetricKey, number>>, notes?, isCompleted`) — but no
  Prisma model, no `@instigi/types` interface, and no endpoints exist yet.
- **SessionExercise already carries everything the UI needs.** From S-02 it
  snapshots `metrics` (`ExerciseMetric[]` with `required?`), `allowedEntryTypes`,
  and `defaultEntryType` (`services/training-service/prisma/schema.prisma:50`,
  DTO at `packages/types/src/index.ts:86`). The logging form renders straight
  from those snapshots — no join to `ExerciseDefinition` at log-time.
- **Metric catalog drives input rendering.** `metricCatalog`
  (`packages/utils/src/metricCatalog.ts`, re-exported browser-safe via
  `@instigi/utils/client`) maps each `MetricKey` to `{ label, input:
  'number'|'duration', min, step }`. Base units are internal: `load`=kg,
  `distance`=metres, `duration`=seconds.
- **Finish is currently unmodelled.** `WorkoutSession.endedAt` exists
  (`schema.prisma:39`) and the DTO already serializes it
  (`packages/types/src/index.ts:107`), and `getActiveSession` already filters
  `endedAt: null` (`sessions.ts:92,121`). No endpoint sets `endedAt` yet, so a
  started session can never end — the active-session guard would block starting a
  second one. This slice closes that loop.
- **Controller/response conventions (S-02, must match):** Zod `.safeParse()` per
  handler, `{ data }` success / `{ message, code, statusCode }` error, no raw Zod
  errors, `req.params['x'] as string`, `.js` intra-service imports, Prisma client
  from `../generated/prisma/client.js`, `Prisma.InputJsonValue` cast for JSON
  columns.
- **RTK Query slice** `apps/web-app/src/features/sessions/sessionsApi.ts` uses
  `tagTypes: ['ActiveSession','Session']`, every endpoint
  `transformResponse: r => r.data`. New mutations extend this slice.
- **UI baseline** `apps/web-app/src/pages/workouts/SessionPage.tsx` renders the
  ordered exercise list; `WorkoutsPage.tsx` is the landing that shows "start" when
  no active session exists. Web-app tests use `fireEvent` + `vi.mock` of the api
  module (not user-event).

### Key Discoveries:

- `ExerciseEntry` spec: `context/foundation/data-model.md:642-671`.
- `ExerciseMetric.required` is the field the completeness rule keys on
  (`packages/types/src/index.ts:62`). Pull-up = `reps` required, `load` optional
  — the canonical mixed case to test.
- Cascade-delete precedent: `SessionExercise.session ... onDelete: Cascade`
  (`schema.prisma:64`). `ExerciseEntry → SessionExercise` uses the same.
- `getSession`/`getActiveSession` use a shared `exercisesInclude`
  (`sessions.ts:78`); entries get nested here via a nested `include`.
- `metricCatalog[key].input === 'duration'` is the single source of truth for
  which metric renders as mm:ss.

## Desired End State

A user with an active session can, per exercise, append sets whose inputs match
that exercise's configured metrics; edit or delete any set; and press **Finish
workout** (enabled only once ≥1 set exists) to save. Finishing sets `endedAt`,
makes the session read-only to further set-writes, and returns the user to the
Workouts landing (now offering "start new" since no session is active). All set
data round-trips: reload shows the same sets with the same values.

Verify: start session → add Bench Press → add a set (reps 8, load 70) → add a
second set → edit set 1 → delete set 2 → Finish → land on Workouts landing →
`GET /api/sessions/:id` returns `endedAt` non-null with the entries intact;
attempting another set-write on it returns 409.

## What We're NOT Doing

- **No entry-type switcher UI.** Each entry stores the exercise's
  `defaultEntryType`; we persist the field but don't let users change it yet.
- **No unit conversion / user preferences.** Values shown in raw base units with
  a static label (kg, m, mm:ss). The `UserMeasurementPreferences` idea in
  data-model.md is deferred.
- **No `rpe`/`calories` metrics.** Only the four initial keys (`reps`, `load`,
  `distance`, `duration`).
- **No workout-history list UI.** That's S-04. "Appears in history immediately"
  is validated there; here we only guarantee `endedAt` is persisted.
- **No re-open / un-finish.** Finished sessions are terminal for this slice.
- **No `isCompleted` UI or toggle.** The column exists (fidelity with
  data-model.md) and defaults `true`; every logged set is complete. Not surfaced.
- **No per-set `notes` UI.** Column may be omitted; not in scope.
- **No discard-session (FR-007).** Nice-to-have, separate slice.

## Implementation Approach

Bottom-up, matching S-02's rhythm: land the shared type contract first so every
later layer type-checks against it; add the Prisma model + migration; build and
test the training-service endpoints (the domain rules live here); wire the RTK
Query data layer; finish with the UI. The metric-completeness rule and the
"not empty" finish rule are enforced **server-side** (authoritative) and mirrored
in the UI as affordances (disabled buttons) — the server is the source of truth.

## Critical Implementation Details

- **Completeness validation is data-driven, not hardcoded.** The add/edit-set
  handler must load the parent `SessionExercise.metricsSnapshot`, then require a
  positive number for every metric with `required !== false`, permit optional
  metrics to be absent, and reject any `values` key not in the snapshot. Do not
  bake in per-exercise rules — read the snapshot.
- **Finished-session lock ordering.** Every set-write handler (add/edit/delete)
  must reject when the parent session has `endedAt != null` (409
  `SESSION_FINISHED`) *before* mutating. The finish handler itself must 409
  `SESSION_ALREADY_FINISHED` if `endedAt` is already set.
- **mm:ss parsing lives in the UI only.** The wire contract for `duration` is
  integer seconds. The SessionPage parses `"1:30" → 90` before calling the
  mutation and formats `90 → "1:30"` for display. Server validates seconds as a
  non-negative number; it never sees mm:ss.
- **`values` JSON must be validated, not trusted.** Use a Zod schema that coerces
  to a record of `MetricKey → nonnegative number` and strips unknown keys, then
  apply the snapshot-driven required check on top.

## Phase 1: Shared Types

### Overview

Establish the `ExerciseEntry` contract and request DTOs in `@instigi/types`, and
nest `entries` under the `SessionExercise` DTO so the whole stack type-checks
against one shape.

### Changes Required:

#### 1. Entry domain types

**File**: `packages/types/src/index.ts`

**Intent**: Add the logged-set entity and its value shape, mirroring
data-model.md, and thread `entries` into the session read model.

**Contract**:
- `ExerciseEntryValues = Partial<Record<MetricKey, number>>`.
- `ExerciseEntry { id: string; sessionExerciseId: string; position: number;
  entryType: EntryType; values: ExerciseEntryValues; isCompleted: boolean }`
  (timestamps not exposed over the wire, consistent with existing DTOs).
- Extend `SessionExercise` with `entries: ExerciseEntry[]`.
- Request DTOs: `LogSetRequest { entryType?: EntryType; values:
  ExerciseEntryValues }`, `UpdateSetRequest { values: ExerciseEntryValues }`.
  (`entryType` optional — server defaults to the exercise's `defaultEntryType`.)

### Success Criteria:

#### Automated Verification:
- Types build: `pnpm --filter @instigi/types build`
- Monorepo typecheck passes: `pnpm typecheck`

#### Manual Verification:
- None (pure type contract).

---

## Phase 2: Prisma Model & Migration

### Overview

Persist entries in a new `exercise_entries` table under the `training` schema,
cascade-deleted with their session exercise.

### Changes Required:

#### 1. ExerciseEntry model

**File**: `services/training-service/prisma/schema.prisma`

**Intent**: Add the entry table and back-relation on `SessionExercise`.

**Contract**: `model ExerciseEntry { id (uuid pk); sessionExerciseId (map
"session_exercise_id"); entryType (map "entry_type", VarChar 40); values Json;
isCompleted Boolean @default(true) @map("is_completed"); position Int; createdAt;
updatedAt; sessionExercise ... @relation(fields:[sessionExerciseId],
references:[id], onDelete: Cascade) }`, `@@index([sessionExerciseId, position])`,
`@@map("exercise_entries")`, `@@schema("training")`. Add `entries
ExerciseEntry[]` to `SessionExercise`.

#### 2. Generate client + migration

**File**: `services/training-service/prisma/migrations/*`

**Intent**: Create and apply the migration; regenerate the Prisma client.

**Contract**: `pnpm --filter @instigi/training-service db:generate` then
`db:migrate` (dev Postgres must be running — `./scripts/dev-postgres.sh`). New
migration folder `*_add_exercise_entries` committed.

### Success Criteria:

#### Automated Verification:
- Prisma schema valid + client regenerated: `pnpm --filter @instigi/training-service db:generate`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`

#### Manual Verification:
- Migration applies cleanly against dev DB; `exercise_entries` table exists with
  the expected columns and the FK cascade.

---

## Phase 3: Training-Service Endpoints & Tests

### Overview

Add set CRUD (add/edit/delete) with snapshot-driven completeness validation, and
a finish endpoint enforcing the "not empty" rule and terminal read-only state.
Nest entries into the session read model.

### Changes Required:

#### 1. Nest entries in the session include + DTO

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Return entries with every session read, ordered by position, and map
them to the DTO.

**Contract**: Extend `exercisesInclude` with a nested `entries: { orderBy: [{
position: 'asc' }, { createdAt: 'asc' }] }`. Add `toEntryDto(row)` mapping
`values` (JSON) → `ExerciseEntryValues`; include `entries` in
`toSessionExerciseDto`. Extend the row interfaces accordingly.

#### 2. Set-logging handlers

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Append, edit, and delete a set, validating values against the parent
exercise's metric snapshot and rejecting writes to a finished session.

**Contract**: Handlers `logSet` (POST), `updateSet` (PATCH), `deleteSet`
(DELETE). Shared preconditions: resolve session by `{ id, userId }` (404 if
missing); 409 `SESSION_FINISHED` if `endedAt != null`; resolve the parent
`SessionExercise` scoped to the session (404 if missing). `logSet`/`updateSet`
Zod schema: `values` = record of the four `MetricKey`s to nonnegative numbers,
unknown keys stripped; then enforce every metric with `required !== false` in
`metricsSnapshot` is present & > 0 → else 400 `VALIDATION_ERROR`. `entryType`
defaults to the exercise's `defaultEntryTypeSnapshot`. `logSet` computes next
`position` (max+1 within the session exercise). Responses return the entry DTO;
`deleteSet` returns `{ data: { id } }`.

#### 3. Finish handler

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Save/close the active session once it has real content.

**Contract**: Handler `finishSession` (POST `/:id/finish`). Resolve `{ id,
userId }` (404); 409 `SESSION_ALREADY_FINISHED` if `endedAt != null`; count
exercises and total entries — require ≥1 exercise AND ≥1 entry, else 422
`SESSION_EMPTY` (`{ message, code, statusCode }`). On success set `endedAt = now`
and return the full session DTO.

#### 4. Routes

**File**: `services/training-service/src/routes/sessions.ts`

**Intent**: Mount the new handlers.

**Contract**: `POST /:id/exercises/:sessionExerciseId/sets` → `logSet`; `PATCH
/:id/exercises/:sessionExerciseId/sets/:entryId` → `updateSet`; `DELETE .../sets/:entryId`
→ `deleteSet`; `POST /:id/finish` → `finishSession`. All `requireAuth`.

#### 5. Tests

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Cover the domain rules with supertest against `app`, mocking
`../db.js`.

**Contract**: log a valid set (201); reject missing required metric (400); accept
omitted optional metric (pull-up load, 201); edit a set (200); delete a set
(200); finish with content (200, `endedAt` set); finish empty → 422
`SESSION_EMPTY`; set-write on finished session → 409 `SESSION_FINISHED`;
double-finish → 409. Follow the existing mock-prisma pattern in the file.

### Success Criteria:

#### Automated Verification:
- Tests pass: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual Verification:
- `POST /:id/exercises/:seId/sets` with valid values returns 201 and the entry.
- `POST /:id/finish` on a session with ≥1 set returns 200 with `endedAt`; a
  subsequent set-write returns 409; a second finish returns 409.

---

## Phase 4: Web-App Data Layer

### Overview

Extend the RTK Query slice with set CRUD + finish mutations, keeping the nested
entries fresh via existing tag invalidation.

### Changes Required:

#### 1. Set + finish mutations

**File**: `apps/web-app/src/features/sessions/sessionsApi.ts`

**Intent**: Add `logSet`, `updateSet`, `deleteSet`, `finishSession` mutations
matching the new endpoints, each invalidating the session + active-session tags.

**Contract**: New arg types (`LogSetArgs { sessionId; sessionExerciseId;
entryType?; values }`, `UpdateSetArgs { …; entryId; values }`, `DeleteSetArgs {
sessionId; sessionExerciseId; entryId }`, `FinishSessionArgs { id }`). Each
`transformResponse: r => r.data`; `invalidatesTags` → `[{ type:'Session', id:
sessionId }, 'ActiveSession']` (finish uses `id`). Export the generated hooks.

### Success Criteria:

#### Automated Verification:
- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Existing tests pass: `pnpm --filter @instigi/web-app test`

#### Manual Verification:
- None (covered by Phase 5 UI verification).

---

## Phase 5: Set-Logging & Finish UI

### Overview

Inline per-exercise set logging on `SessionPage`, with metric-aware inputs,
edit/delete, and a gated Finish action.

### Changes Required:

#### 1. Set list + add/edit form per exercise

**File**: `apps/web-app/src/pages/workouts/SessionPage.tsx` (plus a small
child component, e.g. `ExerciseSetList.tsx`, if it keeps SessionPage readable)

**Intent**: Under each exercise render its ordered sets and an "Add set" row of
inputs derived from `exercise.metrics` + `metricCatalog`; support editing and
deleting a set.

**Contract**: For each metric, render an input using
`metricCatalog[key]`: `input === 'duration'` → mm:ss text field parsed to
seconds on save (`"1:30"→90`) and formatted back for display; else a number
field with `min`/`step`. Show static unit labels (kg, m, mm:ss). Required
metrics marked; submit disabled until required metrics have positive values
(mirrors server rule). Edit reuses the same row seeded with the set's values;
delete removes a set. Follow the render-time state-sync pattern already used in
this file (no `setState` in `useEffect`). Read-only when `session.endedAt` set.

#### 2. Finish workout action

**File**: `apps/web-app/src/pages/workouts/SessionPage.tsx`

**Intent**: A "Finish workout" button, disabled until the session has ≥1 set
total, opening a confirm dialog; on confirm call `finishSession` and navigate to
`/workouts`.

**Contract**: Button disabled when total entry count across exercises is 0.
Confirm dialog (MUI Dialog) → `useFinishSessionMutation` → on success
`navigate('/workouts')`. Surface server 422/409 as an inline error/toast.

#### 3. Component tests

**File**: `apps/web-app/src/pages/workouts/SessionPage.test.tsx` (extend) and/or
new `ExerciseSetList.test.tsx`

**Intent**: Cover the logging + finish affordances with `fireEvent` + `vi.mock`
of `sessionsApi` hooks.

**Contract**: adding a set calls `logSet` with parsed values (duration →
seconds); Finish disabled with zero sets and enabled with ≥1; confirm triggers
`finishSession` then navigation; delete calls `deleteSet`. Mock the api module
per the existing pattern.

### Success Criteria:

#### Automated Verification:
- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Tests pass: `pnpm --filter @instigi/web-app test`
- Build passes: `pnpm --filter @instigi/web-app build`
- Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual Verification:
- Start a session, add Bench Press, add a set (reps 8, load 70) — it appears in
  the list; add a second set.
- Edit set 1's values and see them update; delete set 2.
- Add Plank; the duration input accepts `1:30` and displays back as `1:30`.
- Finish is disabled with zero sets, enabled after the first; confirming saves
  and lands on the Workouts landing showing "start new".
- Reload / re-open the finished session (via direct URL) shows it read-only with
  sets intact; the Workouts landing offers a fresh start.

---

## Testing Strategy

### Unit / Handler Tests:
- Completeness rule: required present (201), required missing (400), optional
  omitted (201), unknown key stripped.
- Finish rule: empty → 422, with content → 200; double-finish → 409; set-write on
  finished → 409.

### Component Tests:
- Metric-aware input rendering; mm:ss parse/format; Finish gating + confirm +
  navigation; edit/delete calls.

### Manual Testing Steps:
1. Full log→finish loop for a strength exercise (Bench Press).
2. Duration exercise (Plank) mm:ss round-trip.
3. Optional-metric exercise (Pull-up: reps only vs reps+load).
4. Finish gating and read-only-after-finish behavior.

## Performance Considerations

Negligible — single-user active session, a handful of exercises/sets. The nested
`entries` include adds one ordered child query per session read; indexed by
`(session_exercise_id, position)`.

## Migration Notes

Additive migration (new table only); no backfill. Existing sessions gain an empty
`entries` array. Dev DB stops between sessions — run `./scripts/dev-postgres.sh`
before `db:migrate`.

## References

- Change identity: `context/changes/log-sets-finish-workout/change.md`
- Domain spec: `context/foundation/data-model.md:642-671` (ExerciseEntry)
- PRD: `context/foundation/prd.md` US-01, FR-005, FR-006
- Prior slice (pattern source): `context/archive/2026-07-16-start-session-add-exercises/plan.md`
- Metric catalog: `packages/utils/src/metricCatalog.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared Types

#### Automated

- [x] 1.1 Types build: `pnpm --filter @instigi/types build` — 28da440
- [x] 1.2 Monorepo typecheck passes: `pnpm typecheck` — 28da440

### Phase 2: Prisma Model & Migration

#### Automated

- [x] 2.1 Prisma schema valid + client regenerated: `pnpm --filter @instigi/training-service db:generate` — c9b3ac7
- [x] 2.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck` — c9b3ac7

#### Manual

- [x] 2.3 Migration applies cleanly; `exercise_entries` table exists with expected columns and FK cascade — c9b3ac7

### Phase 3: Training-Service Endpoints & Tests

#### Automated

- [x] 3.1 Tests pass: `pnpm --filter @instigi/training-service test`
- [x] 3.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- [x] 3.3 Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual

- [x] 3.4 `POST /:id/exercises/:seId/sets` with valid values returns 201 and the entry
- [x] 3.5 `POST /:id/finish` with ≥1 set returns 200 + `endedAt`; subsequent set-write → 409; second finish → 409

### Phase 4: Web-App Data Layer

#### Automated

- [ ] 4.1 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 4.2 Lint passes: `pnpm --filter @instigi/web-app lint`
- [ ] 4.3 Existing tests pass: `pnpm --filter @instigi/web-app test`

### Phase 5: Set-Logging & Finish UI

#### Automated

- [ ] 5.1 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 5.2 Lint passes: `pnpm --filter @instigi/web-app lint`
- [ ] 5.3 Tests pass: `pnpm --filter @instigi/web-app test`
- [ ] 5.4 Build passes: `pnpm --filter @instigi/web-app build`
- [ ] 5.5 Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual

- [ ] 5.6 Add/edit/delete sets on a strength exercise work inline
- [ ] 5.7 Duration input accepts and displays mm:ss (Plank)
- [ ] 5.8 Optional-metric exercise (Pull-up) accepts reps-only and reps+load
- [ ] 5.9 Finish gated until ≥1 set; confirm saves and navigates to Workouts landing
- [ ] 5.10 Finished session is read-only with sets intact on re-open
