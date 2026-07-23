# Start a Session & Add Exercises (S-02) Implementation Plan

## Overview

Deliver roadmap slice **S-02**: a signed-in user can start a single active workout
session (title editable, defaulting to today's date) and add exercises to it from
the predefined library, plus remove ones added by mistake. This is the second
slice of the core logging loop (FR-003 + FR-004, US-01). Logging sets (FR-005),
finishing/saving (FR-006), and history are **out of scope** — they belong to S-03
and later.

## Current State Analysis

- **Backend (`services/training-service`)** exposes one feature today: `GET
  /api/exercises` (browse). Established conventions (`services/AGENTS.md`): ESM
  `.js` imports, Prisma client from `./generated/prisma/client.js`, one Zod
  `.safeParse` schema per handler, response shape `{ data }` / `{ message, code,
  statusCode }`, `requireAuth` from `@instigi/utils`, supertest against the `app`
  export with `vi.mock('../db.js')`. Prisma schema (`prisma/schema.prisma`) has
  **only** `ExerciseDefinition` in the `training` Postgres schema.
- **Data model** (`context/foundation/data-model.md:536-953`) fully specifies
  `workout_sessions`, `session_exercises` (with a definition **snapshot**:
  name/category/metrics/entryTypes + `position`, soft ref
  `exercise_definition_id`), and `exercise_entries`. None are built yet.
- **Shared types** (`packages/types/src/index.ts`) define `Exercise`,
  `ExerciseCategory`, `ExerciseMetric`, `EntryType`, `MetricKey`, `ApiResponse<T>`.
  No session types yet.
- **Frontend (`apps/web-app`)** has `exercisesApi` (browse/search), the
  `createBaseQueryWithReauth(baseUrl)` factory (`features/api/baseQuery.ts`), the
  store wiring pattern (`store.ts`), protected routing under `AppLayout`
  (`router.tsx`), and an `AppLayout` whose **Workouts** nav item is currently
  `disabled` (`layouts/AppLayout.tsx`). The `metricCatalog` client barrel
  (`@instigi/utils/client`) provides metric labels.

## Desired End State

A signed-in user visits **Workouts**. If they have no active session they see a
"Start workout" action; starting creates a session (title = today's date, e.g.
"Jul 16 workout") and lands them on `/workouts/:sessionId`. There they can edit
the title, open an **Add exercise** dialog that reuses the library browse
(search + category), add exercises (duplicates allowed, appended in order), and
remove ones added by mistake. Re-opening Workouts resumes the same active
session. All state is served by the training-service; the UI reads it via RTK
Query and refetches on mutation.

Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green; the flow
above works end-to-end against a running training-service + seeded DB; no
regressions in auth or the exercises page.

### Key Discoveries:

- Snapshot pattern is mandated by the data model (`data-model.md:571-599`) — copy
  definition fields into `session_exercises` at add-time; keep
  `exercise_definition_id` as a **soft ref** (no DB FK / relation) so a later
  definition edit or archive can't rewrite history.
- Ownership scoping mirrors `controllers/exercises.ts:43-55`: every session route
  is scoped to `req.user.userId`; the add-exercise definition lookup reuses the
  global-or-owned (`userId null OR userId`), non-archived filter.
- Response/error shapes and the supertest+`vi.mock('../db.js')` harness are
  fixed by `services/AGENTS.md` and `__tests__/exercises.test.ts`.
- The `baseQuery` factory + store-slice registration pattern (used by
  `exercisesApi`) drops in directly for a `sessionsApi`.

## What We're NOT Doing

- No `exercise_entries` table, set logging, or metric value capture (FR-005 → S-03).
- No finish/save workout (FR-006 → S-03), no workout history views.
- No discard-session (FR-007, nice-to-have) — deferred.
- No exercise reordering (only add + remove in S-02).
- No custom/user-created exercise definitions (out of the library's current scope).
- No multiple concurrent active sessions — exactly one `endedAt IS NULL` per user.

## Implementation Approach

Build back-to-front in five thin phases, mirroring the S-01 shape: shared
contract → data model → endpoints → web-app data layer → UI. The server is the
single source of truth; the frontend holds no session state beyond RTK Query
cache. Mutations invalidate cache tags to refetch the active session / session
detail.

### API surface (training-service, mounted at `/api/sessions`)

- `POST /api/sessions` — create; body `{ title? }`; **409 `ACTIVE_SESSION_EXISTS`**
  if the user already has an `endedAt IS NULL` session.
- `GET /api/sessions/active` — the current in-progress session (with exercises) or
  `{ data: null }`.
- `GET /api/sessions/:id` — one owned session with its exercises; 404 otherwise.
- `PATCH /api/sessions/:id` — edit `{ title }`.
- `POST /api/sessions/:id/exercises` — add `{ exerciseDefinitionId }`; snapshots the
  definition, appends `position = max+1`.
- `DELETE /api/sessions/:id/exercises/:sessionExerciseId` — remove.

## Critical Implementation Details

- **Single-active enforcement is a race-tolerant read-then-write.** The create
  handler checks for an existing `endedAt IS NULL` session and 409s. Under the
  MVP's single-user-per-account, low-concurrency assumption this is sufficient;
  no advisory lock is warranted. A partial unique index is noted as a future
  hardening but not built here.
- **Timestamps cross the wire as ISO strings.** Session DTOs type
  `startedAt`/`endedAt` as `string` (not `Date`) so RTK Query cache stays
  serializable — do not reuse the `User` type's `Date` fields as a precedent here.
- **Snapshot DTO field names drop the `Snapshot` suffix.** DB columns are
  `*_snapshot` (per data-model); the `SessionExercise` DTO exposes clean
  `name`/`category`/`metrics`/`allowedEntryTypes`/`defaultEntryType`.

## Phase 1: Shared contract (`@instigi/types`)

### Overview

Add the session DTOs and request shapes both the service and web-app compile against.

### Changes Required:

#### 1. Session domain types

**File**: `packages/types/src/index.ts`

**Intent**: Define the browse/build-facing session shapes so backend and frontend
share one contract. Never expose `userId`.

**Contract**: Add and export:
- `SessionExercise` — `{ id, sessionId, exerciseDefinitionId: string | null, name,
  category: ExerciseCategory, metrics: ExerciseMetric[], allowedEntryTypes:
  EntryType[], defaultEntryType: EntryType, position: number }`.
- `WorkoutSession` — `{ id, title: string, startedAt: string, endedAt: string |
  null, exercises: SessionExercise[] }`.
- `CreateSessionRequest` — `{ title?: string }`.
- `UpdateSessionRequest` — `{ title: string }`.
- `AddSessionExerciseRequest` — `{ exerciseDefinitionId: string }`.

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `pnpm --filter @instigi/types typecheck`
- Package builds: `pnpm --filter @instigi/types build`
- Monorepo lint passes: `pnpm lint`

#### Manual Verification:

- New types are importable from `@instigi/types` (spot-check via editor autocomplete).

**Implementation Note**: After automated verification passes, pause for manual
confirmation before Phase 2.

---

## Phase 2: Data model + migration (`training-service`)

### Overview

Add the `WorkoutSession` and `SessionExercise` Prisma models, migrate, and
regenerate the client. No `exercise_entries`.

### Changes Required:

#### 1. Prisma models

**File**: `services/training-service/prisma/schema.prisma`

**Intent**: Persist sessions and their snapshotted exercises in the `training`
schema, following the existing `ExerciseDefinition` mapping conventions
(snake_case `@map`, `@@schema("training")`).

**Contract**:
- `WorkoutSession` → table `workout_sessions`: `id uuid pk`, `userId @map("user_id")`,
  `startedAt @map("started_at")`, `endedAt DateTime? @map("ended_at")`, `title
  String? @db.VarChar(160)`, `notes String?`, `createdAt`/`updatedAt`, relation
  `exercises SessionExercise[]`; `@@index([userId])`, `@@index([userId, endedAt])`.
- `SessionExercise` → table `session_exercises`: `id uuid pk`, `sessionId
  @map("session_id")` with `@relation(... onDelete: Cascade)` to `WorkoutSession`,
  `exerciseDefinitionId String? @map("exercise_definition_id")` (**soft ref, no
  relation**), snapshot cols `exerciseNameSnapshot`/`categorySnapshot`/
  `metricsSnapshot Json`/`allowedEntryTypesSnapshot Json`/`defaultEntryTypeSnapshot`,
  `position Int`, `notes String?`, `createdAt`/`updatedAt`; `@@index([sessionId, position])`
  (composite, matching data-model DDL `idx_session_exercises_session_position` and
  backing the position-ordered read).

#### 2. Migration + client generation

**File**: `services/training-service/prisma/migrations/<timestamp>_add_workout_sessions/migration.sql` (generated)

**Intent**: Create the two tables via a Prisma migration and regenerate the typed client.

**Contract**: `pnpm --filter @instigi/training-service db:migrate` (creates the
migration) then `db:generate`. Migration creates both tables with the cascade
FK on `session_exercises.session_id` and the listed indexes.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `pnpm --filter @instigi/training-service db:migrate`
- Client regenerates: `pnpm --filter @instigi/training-service db:generate`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`

#### Manual Verification:

- `workout_sessions` and `session_exercises` exist in the `training` schema with the expected columns/indexes.

**Implementation Note**: After automated verification passes, pause for manual
confirmation before Phase 3.

---

## Phase 3: Sessions endpoints (`training-service`)

### Overview

Add the sessions controller, router, mount, and supertest coverage. Every route
is `requireAuth` + ownership-scoped + Zod-validated.

### Changes Required:

#### 1. Sessions controller

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Implement create / get-active / get-by-id / update-title /
add-exercise / remove-exercise, mapping Prisma rows to the shared DTOs (title
defaulted, no `userId` leak, snapshot suffix dropped).

**Contract**:
- Zod schemas: `createSessionSchema { title?: string trim max 160 }`,
  `updateSessionSchema { title: string trim min 1 max 160 }`,
  `addExerciseSchema { exerciseDefinitionId: string uuid }`. On failure →
  `{ message, code: 'VALIDATION_ERROR', statusCode: 400 }`.
- `createSession`: 409 `{ code: 'ACTIVE_SESSION_EXISTS' }` if an `endedAt: null`
  session exists for the user; else create with `startedAt = now`, `title =
  body.title ?? <today formatted "MMM D workout">`; return `{ data: WorkoutSession }`
  (empty `exercises`).
- `getActiveSession`: find `endedAt: null` for user (include exercises ordered by
  `[{ position: 'asc' }, { createdAt: 'asc' }]` — the `createdAt` tiebreaker keeps
  order deterministic when two rows share a `position`); return `{ data: WorkoutSession | null }`.
- `getSession`: find by id **scoped to userId**; 404 `{ code: 'NOT_FOUND' }`
  otherwise; include exercises ordered `[{ position: 'asc' }, { createdAt: 'asc' }]`.
- `updateSession`: ownership-checked title update; 404 if not owned.
- `addSessionExercise`: verify session ownership (404); look up the definition by
  id with the global-or-owned + non-archived filter (404
  `{ code: 'EXERCISE_NOT_FOUND' }` if absent); snapshot its fields; `position =
  (max position for session) + 1`; return `{ data: SessionExercise }`.
- `removeSessionExercise`: verify the session_exercise belongs to an owned session
  (404); delete; return `{ data: { id } }`.
- DTO mappers `toSessionDto` / `toSessionExerciseDto` (mirror
  `controllers/exercises.ts:toExerciseDto`).

#### 2. Router

**File**: `services/training-service/src/routes/sessions.ts`

**Intent**: Wire the six handlers behind `requireAuth`.

**Contract**: Named `sessionsRouter: ExpressRouter`. `POST /`, `GET /active`,
`GET /:id`, `PATCH /:id`, `POST /:id/exercises`, `DELETE
/:id/exercises/:sessionExerciseId` — all `requireAuth`. Order `/active` before
`/:id`.

#### 3. Mount

**File**: `services/training-service/src/app.ts`

**Intent**: Serve the router.

**Contract**: `app.use('/api/sessions', sessionsRouter)`.

#### 4. Tests

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Cover auth, ownership, validation, single-active 409, snapshotting,
and no-`userId`-leak — matching the exercises test harness.

**Contract**: `vi.mock('../db.js')` with the `workoutSession` +
`sessionExercise` delegates used; supertest against `app`; JWT signed with
`process.env.JWT_SECRET`. Cases: 401 no/invalid token; create returns default
title; create 409 when active exists; get-active null; get-by-id 404 for
other-user's session; add-exercise snapshots definition + appends position;
add-exercise 404 for unknown definition; remove 404 for foreign session_exercise;
validation 400s.

### Success Criteria:

#### Automated Verification:

- Tests pass: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual Verification:

- With a real token: create → add two exercises → get active shows both in order → remove one → 409 on second create while active.
- A second user cannot read/mutate the first user's session (404).

**Implementation Note**: After automated verification passes, pause for manual
confirmation before Phase 4.

---

## Phase 4: Web-app data layer (`sessionsApi`)

### Overview

Add the RTK Query `sessionsApi` slice and register it in the store.

### Changes Required:

#### 1. Sessions API slice

**File**: `apps/web-app/src/features/sessions/sessionsApi.ts`

**Intent**: Expose typed hooks for the session flow; mutations invalidate cache so
the active session / detail refetch.

**Contract**: `createApi({ reducerPath: 'sessionsApi', baseQuery:
createBaseQueryWithReauth(`${TRAINING_API_BASE}/api/sessions`), tagTypes:
['ActiveSession', 'Session'] })`, `TRAINING_API_BASE` from
`import.meta.env.VITE_TRAINING_API_URL` (same default as `exercisesApi`).
Endpoints (all `transformResponse: r => r.data`):
- `getActiveSession` query → `GET /active`, provides `['ActiveSession']`.
- `getSession` query(id) → `GET /:id`, provides `[{ type: 'Session', id }]`.
- `createSession` mutation(CreateSessionRequest) → `POST ''`, invalidates `['ActiveSession']`.
- `updateSession` mutation({ id, ...UpdateSessionRequest }) → `PATCH /:id`, invalidates `[{ type:'Session', id }, 'ActiveSession']`.
- `addSessionExercise` mutation({ sessionId, exerciseDefinitionId }) → `POST /:sessionId/exercises`, invalidates `[{ type:'Session', id: sessionId }, 'ActiveSession']`.
- `removeSessionExercise` mutation({ sessionId, sessionExerciseId }) → `DELETE /:sessionId/exercises/:sessionExerciseId`, invalidates `[{ type:'Session', id: sessionId }, 'ActiveSession']`.
Export the generated hooks; export any param interfaces used by the store type
(guard TS4023 as in `exercisesApi`).

#### 2. Store registration

**File**: `apps/web-app/src/store.ts`

**Intent**: Add the reducer + middleware.

**Contract**: Add `[sessionsApi.reducerPath]: sessionsApi.reducer` and concat
`sessionsApi.middleware`.

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Tests pass: `pnpm --filter @instigi/web-app test`
- Build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual Verification:

- Redux DevTools shows a `sessionsApi` slice once a session view mounts (may be deferred to Phase 5 when a component consumes a hook).

**Implementation Note**: After automated verification passes, pause for manual
confirmation before Phase 5.

---

## Phase 5: Workouts UI

### Overview

Enable the Workouts nav and build the workouts landing + active-session pages and
the add-exercise dialog, with component tests mocking the `sessionsApi` /
`exercisesApi` hooks.

### Changes Required:

#### 1. Enable Workouts navigation

**File**: `apps/web-app/src/layouts/AppLayout.tsx`

**Intent**: Route the Workouts nav (sidebar + bottom nav) to `/workouts` instead of disabled.

**Contract**: In `NAV_ITEMS` and `BOTTOM_NAV_ITEMS`, the Workouts entry becomes
`{ label: 'Workouts', icon: <FitnessCenterIcon />, to: '/workouts' }` (drop `disabled`).
Also relax the active/`selected` check so a `to` prefix-matches the pathname (e.g.
`location.pathname === item.to || location.pathname.startsWith(item.to + '/')`), so
`/workouts/:sessionId` still highlights Workouts.

#### 2. Routes

**File**: `apps/web-app/src/router.tsx`

**Intent**: Add the two workouts routes under the protected `AppLayout`.

**Contract**: Children of the `AppLayout` route gain `{ path: 'workouts',
Component: WorkoutsPage }` and `{ path: 'workouts/:sessionId', Component:
SessionPage }`.

#### 3. Workouts landing page

**File**: `apps/web-app/src/pages/WorkoutsPage.tsx`

**Intent**: Show the active session (with a Continue action) or a Start-workout
action; loading/error states.

**Contract**: `useGetActiveSessionQuery()`; if data present render a summary card
(title, exercise count) + Continue → `navigate('/workouts/' + id)`; else a "Start
workout" button → `useCreateSessionMutation` then navigate to the new id. Reuse
the `ExercisesStates`-style loading/error idioms.

#### 4. Active session page

**File**: `apps/web-app/src/pages/workouts/SessionPage.tsx`

**Intent**: The build-a-session view: editable title, ordered exercise list with
remove, Add-exercise entry point, empty state.

**Contract**: `useParams().sessionId` + `useGetSessionQuery(sessionId)`. Inline
editable title (TextField) committing via `useUpdateSessionMutation` on
blur/enter. List each `session.exercises` (name, category chip, metric labels via
`metricCatalog`) with a remove button → `useRemoveSessionExerciseMutation`. "Add
exercise" button opens `AddExerciseDialog`. Empty state when
`exercises.length === 0`. Loading/error states.

#### 5. Add-exercise dialog

**File**: `apps/web-app/src/pages/workouts/AddExerciseDialog.tsx`

**Intent**: Modal reusing the library browse to add exercises to the session;
stays open so multiple can be added.

**Contract**: MUI `Dialog`; owns local `search`/`category` state (debounced
search, matching `ExercisesPage`); reuses `ExercisesToolbar`; renders
`useListExercisesQuery(params)` results as a selectable list, each row with an
"Add" action → `useAddSessionExerciseMutation({ sessionId, exerciseDefinitionId })`; while a row's
add mutation is pending, disable that row's "Add" action (guards against a
double-click producing two rows with the same `position`); loading/empty/error
states. Props `{ sessionId, open, onClose }`.

#### 6. Component tests

**File**: `apps/web-app/src/pages/WorkoutsPage.test.tsx`, `apps/web-app/src/pages/workouts/SessionPage.test.tsx`, `apps/web-app/src/pages/workouts/AddExerciseDialog.test.tsx`

**Intent**: Cover the key transitions without a real store/API, mocking the hooks
(`vi.mock` the api modules), following `ExercisesPage.test.tsx`.

**Contract**: WorkoutsPage — no-active → Start button calls create; active →
Continue navigates. SessionPage — renders title + exercises, empty state, remove
calls mutation, opens dialog. AddExerciseDialog — lists exercises, Add calls
mutation with the right ids.

### Success Criteria:

#### Automated Verification:

- Tests pass: `pnpm --filter @instigi/web-app test`
- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Build succeeds: `pnpm --filter @instigi/web-app build`
- Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual Verification:

- Start a workout from the Workouts nav → lands on the active session with today's-date title.
- Add several exercises (including a duplicate) via the dialog; they appear in order; remove one.
- Edit the title; reload — the change and the exercise list persist.
- Leave and re-open Workouts → the same active session resumes; starting a second is prevented.
- No regressions in auth or the exercises page; no console errors.

**Implementation Note**: After automated verification passes, pause for manual
confirmation before the commit ritual. This is the final phase — roll up any
deferred manual items.

---

## Testing Strategy

### Unit / Integration Tests:

- **training-service** (`sessions.test.ts`, supertest + `vi.mock('../db.js')`):
  auth, ownership 404s, single-active 409, default title, snapshot on add, position
  append, unknown-definition 404, remove foreign 404, validation 400s.
- **web-app** (component tests, mocked hooks): WorkoutsPage start/continue,
  SessionPage render/empty/remove/open-dialog, AddExerciseDialog list/add.

### Manual Testing Steps:

1. Start workout → active session with default title.
2. Add two exercises + a duplicate → ordered list; remove one.
3. Edit title, reload → persists.
4. Re-open Workouts → resumes; second start blocked.
5. Second account cannot see the first's session.

## Migration Notes

One additive Prisma migration creating `workout_sessions` + `session_exercises`
in the `training` schema. No data backfill. `exercise_definitions` is untouched.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-02)
- PRD: `context/foundation/prd.md` (FR-003, FR-004, US-01)
- Data model: `context/foundation/data-model.md:536-953`
- Service conventions: `services/AGENTS.md`
- Browse endpoint precedent: `services/training-service/src/controllers/exercises.ts`
- API slice precedent: `apps/web-app/src/features/exercises/exercisesApi.ts`
- Reauth base query: `apps/web-app/src/features/api/baseQuery.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared contract (`@instigi/types`)

#### Automated

- [x] 1.1 Typecheck passes: `pnpm --filter @instigi/types typecheck` — 80c1a1e
- [x] 1.2 Package builds: `pnpm --filter @instigi/types build` — 80c1a1e
- [x] 1.3 Monorepo lint passes: `pnpm lint` — 80c1a1e

#### Manual

- [x] 1.4 New types are importable from `@instigi/types` — 80c1a1e

### Phase 2: Data model + migration (`training-service`)

#### Automated

- [x] 2.1 Migration applies cleanly: `pnpm --filter @instigi/training-service db:migrate`
- [x] 2.2 Client regenerates: `pnpm --filter @instigi/training-service db:generate`
- [x] 2.3 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`

#### Manual

- [x] 2.4 `workout_sessions` and `session_exercises` exist in the `training` schema with expected columns/indexes

### Phase 3: Sessions endpoints (`training-service`)

#### Automated

- [ ] 3.1 Tests pass: `pnpm --filter @instigi/training-service test`
- [ ] 3.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- [ ] 3.3 Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual

- [ ] 3.4 Create → add two exercises → get active shows both in order → remove one → 409 on second create
- [ ] 3.5 A second user cannot read/mutate the first user's session (404)

### Phase 4: Web-app data layer (`sessionsApi`)

#### Automated

- [ ] 4.1 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 4.2 Lint passes: `pnpm --filter @instigi/web-app lint`
- [ ] 4.3 Tests pass: `pnpm --filter @instigi/web-app test`
- [ ] 4.4 Build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual

- [ ] 4.5 Redux DevTools shows a `sessionsApi` slice once a session view mounts

### Phase 5: Workouts UI

#### Automated

- [ ] 5.1 Tests pass: `pnpm --filter @instigi/web-app test`
- [ ] 5.2 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 5.3 Lint passes: `pnpm --filter @instigi/web-app lint`
- [ ] 5.4 Build succeeds: `pnpm --filter @instigi/web-app build`
- [ ] 5.5 Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual

- [ ] 5.6 Start a workout from the Workouts nav → active session with today's-date title
- [ ] 5.7 Add several exercises (incl. a duplicate) in order; remove one
- [ ] 5.8 Edit title; reload → title + exercise list persist
- [ ] 5.9 Re-open Workouts resumes the same session; second start is prevented
- [ ] 5.10 No regressions in auth or the exercises page; no console errors
