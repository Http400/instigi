# Exercise Library Browse Implementation Plan

## Overview

Deliver the first user-visible workout slice (S-01): a signed-in user opens the exercises page and sees a real, predefined, metric-configured exercise library served by the F-01 `training-service`, can search it by name, and can filter it by category — with proper loading, empty, and error states. This replaces the placeholder data currently rendered by the already-built F-02 page shell.

## Current State Analysis

**Backend — `services/training-service` (F-01 scaffold, bare):**

- `src/app.ts` mounts only `cors`, `express.json`, and a `GET /health` route. No feature routers.
- `prisma/schema.prisma` declares the `training` schema but has **zero models**. One prior migration (`20260706164741_init`) exists.
- Shared auth is available: `requireAuth` + `AuthRequest` from `@instigi/utils` (verified working by `src/__tests__/auth-middleware.test.ts`). `req.user` is `{ userId, email, role }`.
- `src/db.ts` exports a singleton `prisma` from `./generated/prisma/client.js` via the `@prisma/adapter-pg` adapter.
- `services/AGENTS.md` rules: intra-service imports use `.js`; success shape `{ data: T }`, error shape `{ message, code, statusCode }`; validate every input with Zod `.safeParse()` returning `code: 'VALIDATION_ERROR'` on failure; import Prisma from the generated client; run `db:generate` after schema edits; `DATABASE_URL` includes `?schema=training` (already set in `docker-compose.yml` and `.env`).

**Shared packages:**

- `packages/types/src/index.ts` — holds `User`, `ApiResponse<T>`, `ApiError`, etc. No exercise types yet.
- `packages/utils/src/index.ts` — exports `verifyAccessToken`, `requireAuth`, `TokenPayload`, `AuthRequest`. Runtime helpers live here; good home for the `metricCatalog`.

**Frontend — `apps/web-app` (F-02 shell, presentational only):**

- `src/pages/ExercisesPage.tsx` renders `PLACEHOLDER_EXERCISES` (`src/pages/exercises/placeholderExercises.ts`) into `ExercisesTable`, with `ExercisesToolbar` above.
- `ExercisesToolbar.tsx` — search `TextField` (uncontrolled), category `Chip`s hardcoded `selected = label === 'All'`, and an `All status / Active / Archived` `Select`. None are wired to state.
- `ExercisesTable.tsx` — renders rows typed `PlaceholderExercise` (PascalCase `category`, `metrics: string[]`, an `icon` hint). Category chip color + leading icon are keyed off those fields.
- `ExercisesStates.tsx` — exports `ExercisesEmptyState` and `ExercisesLoading` (skeleton). **No error state.**
- `src/router.tsx` — `/exercises` is already inside `ProtectedRoute` → `AppLayout`. No routing change needed.
- Data layer: `src/store.ts` wires `authApi` (RTK Query) with a `baseQueryWithReauth` in `src/features/auth/authApi.ts` that reads `auth.accessToken`, refreshes against auth-service `/refresh` on 401 (module-level mutex), and dispatches `tokensRefreshed` / `loggedOut`. Base URL comes from `VITE_API_URL` (`http://localhost:4000`).

**Category / metric mismatch to reconcile:** the F-02 shell uses PascalCase categories and treats `Swimming` as its own category; the data model (`context/foundation/data-model.md`) uses lowercase `strength | cardio | mobility | custom` and folds swimming into `cardio`. Per decision, the plan adopts the data-model taxonomy and drops the standalone Swimming chip.

**Service reachability:** training-service runs on `localhost:4001` (dev) and `training-api.instigi.com` (prod, per `caddy/Caddyfile`). The web-app has no env var for it yet.

## Desired End State

A signed-in user navigating to `/exercises` sees the 8 predefined exercises fetched live from `training-service`, each with its category chip and human-readable metric labels (e.g. "Reps, Weight"). Typing in the search box filters by name; clicking a category chip filters by category; both are driven server-side. While the request is in flight a skeleton shows; a failed request shows an error state with a retry; a query with no matches shows the empty state. The "New exercise" button remains disabled and the status select is gone.

Verify by: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green; `docker compose up` migrates + seeds the `training` schema; hitting `GET http://localhost:4001/api/exercises` with a valid auth-service token returns `{ data: [...] }` with 8 items; the exercises page renders them and search/category filtering works.

### Key Discoveries:

- `requireAuth` from `@instigi/utils` already populates `req.user.userId` — the browse endpoint can scope "the caller's own" exercises without new JWT work (`services/training-service/src/__tests__/auth-middleware.test.ts`).
- The training-service test pattern is fixed by `services/AGENTS.md`: `vi.mock('../db.js', …)` at top of file, supertest against the `app` export, then `await import('../db.js')` for the mocked client (reference: `services/auth-service/src/__tests__/auth.test.ts`).
- `authApi.ts` already contains a complete reauth base query; Phase 4 extracts it into a reusable factory rather than duplicating the mutex/refresh logic.
- The data model specifies base units (load=kg, distance=m, duration=s) and a `metricCatalog` with labels ("Weight" for `load`) — labels come from the catalog, not the metric key.
- `ExercisesTable` keys its icon off an `icon` field that does not exist in the data model; the plan derives the icon from `category` (with a name-based override for swimming if desired) instead of persisting it.

## What We're NOT Doing

- **Not** implementing user-created exercises (create/edit/archive). The schema supports it (nullable `userId`, `isArchived`), but the "New exercise" button stays disabled — that is a later slice.
- **Not** building workout sessions, session exercises, or entries (S-02+). Only `ExerciseDefinition` is modeled now.
- **Not** adding the `rpe` / `calories` metrics — only `reps | load | distance | duration` per the data model's "recommended first version".
- **Not** wiring the `Active / Archived` status select — it is removed for this slice.
- **Not** adding user measurement-preference unit conversion (kg↔lb, m↔km). Values are not displayed in this browse-only slice.
- **Not** changing routing, auth-service, or the auth API contract.

## Implementation Approach

Bottom-up: establish the shared contract first (types + catalog) so backend and frontend compile against the same source of truth, then build the backend data + endpoint, then the frontend data layer, then the UI wiring. Each phase is independently verifiable and leaves the repo green.

## Critical Implementation Details

- **Prisma `training` schema mapping** — this is the first model in the service. The model must set `@@schema("training")` and map to the `exercise_definitions` table/columns from the data model (snake_case DB columns via `@map`). JSON columns (`metrics`, `allowed_entry_types`) are `Json` in Prisma; enums can be modeled as `String` columns validated at the app boundary by Zod to avoid a Postgres enum migration.
- **Seed must be idempotent** — the predefined (global, `userId = null`) rows must upsert on a stable natural key so re-running `db:seed` (and the compose migrate-on-boot path) doesn't duplicate them. Use a deterministic `id` (or a unique constraint on `(user_id, name)` with `userId` null for globals) so upsert is stable.
- **Reauth on a second base URL** — the exercises API lives on a different origin than auth, but a 401 must still refresh against the auth-service `/refresh`. The extracted base-query factory takes the resource base URL for normal requests but always points refresh at `VITE_API_URL`/api/auth. The existing module-level refresh mutex must be shared (or preserved per-factory) so concurrent 401s across both APIs don't trigger parallel refreshes.

## Phase 1: Shared exercise contract (`@instigi/types` + `@instigi/utils`)

### Overview

Define the exercise domain types once and the runtime metric catalog once, so both services and the web-app import a single source of truth.

### Changes Required:

#### 1. Exercise domain types

**File**: `packages/types/src/index.ts`

**Intent**: Add the exercise enums and the browse-facing interface so backend responses and frontend consumers share one contract.

**Contract**: Export `ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'custom'`; `MetricKey = 'reps' | 'load' | 'distance' | 'duration'`; `EntryType = 'set' | 'single' | 'lap' | 'interval'`; `interface ExerciseMetric { key: MetricKey; required?: boolean }`; and an `interface Exercise` (the browse DTO) with `id`, `name`, `category`, `metrics: ExerciseMetric[]`, `allowedEntryTypes: EntryType[]`, `defaultEntryType: EntryType`, `isPredefined: boolean` (derived from `userId === null`). Keep field names camelCase; do not leak `userId` to the client DTO.

#### 2. Runtime metric catalog

**File**: `packages/utils/src/metricCatalog.ts` (new), re-exported from `packages/utils/src/index.ts`

**Intent**: Provide label/input/validation metadata keyed by `MetricKey`, mirroring `context/foundation/data-model.md`, for the frontend to render labels ("Weight" for `load`) and later for validation.

**Contract**: Export `type MetricInputType = 'number' | 'duration'`; `interface MetricCatalogItem { label: string; input: MetricInputType; min?: number; max?: number; step?: number }`; and `const metricCatalog: Record<MetricKey, MetricCatalogItem>` for the four initial keys. Import `MetricKey` from `@instigi/types`. Add the `@instigi/types` workspace dep to `packages/utils/package.json` if not already present.

### Success Criteria:

#### Automated Verification:

- Types package builds: `pnpm --filter @instigi/types build`
- Utils package builds: `pnpm --filter @instigi/utils build`
- Utils tests pass (if present): `pnpm --filter @instigi/utils test`
- Workspace typecheck passes: `pnpm typecheck`

#### Manual Verification:

- `metricCatalog` labels/units match `context/foundation/data-model.md` (e.g. `load.label === 'Weight'`, `duration.input === 'duration'`).

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: training-service data model — `ExerciseDefinition` + migration + seed

### Overview

Add the first Prisma model to `training-service`, generate the migration, and seed the 8 predefined global exercises idempotently.

### Changes Required:

#### 1. Prisma model

**File**: `services/training-service/prisma/schema.prisma`

**Intent**: Model `ExerciseDefinition` per the data model, mapped to the `exercise_definitions` table in the `training` schema, with a nullable `userId` so `null` = global predefined and a set value = user-owned.

**Contract**: Add `model ExerciseDefinition` with fields `id String @id @default(uuid())`, `userId String? @map("user_id")`, `name`, `category`, `metrics Json`, `allowedEntryTypes Json @map("allowed_entry_types")`, `defaultEntryType String @map("default_entry_type")`, `isArchived Boolean @default(false) @map("is_archived")`, `createdAt`/`updatedAt` timestamps, `@@map("exercise_definitions")`, `@@schema("training")`. Add a unique constraint supporting idempotent global upserts (e.g. `@@unique([userId, name])`) and the `user_id` / `(user_id, is_archived)` indexes from the data model. Enums stored as `String`, validated in the controller.

#### 2. Migration

**File**: `services/training-service/prisma/migrations/<timestamp>_add_exercise_definitions/migration.sql` (generated)

**Intent**: Create the table + indexes. Generated via `pnpm --filter @instigi/training-service db:migrate`.

**Contract**: `CREATE TABLE training.exercise_definitions (…)` matching the data model's DDL, plus the recommended indexes. Run `db:generate` after the schema edit per AGENTS.md.

#### 3. Seed script

**File**: `services/training-service/prisma/seed.ts` (new) + `db:seed` script + `prisma.seed` config in `services/training-service/package.json`

**Intent**: Upsert the 8 predefined exercises (`userId = null`) from `context/foundation/data-model.md` so browse has data; idempotent for re-runs and compose boot.

**Contract**: Export a seed routine that upserts Bench Press, Squat, Deadlift, Pull-up, Plank, Running, Cycling, Swimming with the exact `category` / `metrics` / `allowedEntryTypes` / `defaultEntryType` from the data-model summary table (swimming category = `cardio`). Upsert keyed on the stable natural key (global name). Wire `"db:seed": "tsx prisma/seed.ts"` and Prisma's `seed` config so `prisma migrate` / a compose step can invoke it.

### Success Criteria:

#### Automated Verification:

- Prisma client generates: `pnpm --filter @instigi/training-service db:generate`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`
- Build succeeds: `pnpm --filter @instigi/training-service build`

#### Manual Verification:

- `db:migrate` creates `training.exercise_definitions` (verify in psql/pgAdmin).
- `db:seed` inserts 8 rows with `user_id IS NULL`; running it twice does not duplicate rows.
- Seeded categories/metrics match the data-model summary (swimming is `cardio`).

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 3.

---

## Phase 3: training-service browse endpoint — `GET /api/exercises`

### Overview

Expose an authenticated, filterable browse endpoint that returns global predefined exercises plus the caller's own, shaped as the `Exercise` DTO.

### Changes Required:

#### 1. Controller

**File**: `services/training-service/src/controllers/exercises.ts` (new)

**Intent**: Handle `GET /api/exercises`, validate query params, query non-archived exercises where `userId` is null OR equals `req.user.userId`, optionally filtered by name search and category, and map rows to the client `Exercise` DTO.

**Contract**: Zod-validate query `{ search?: string; category?: ExerciseCategory }` with `.safeParse()`; on failure return `{ message, code: 'VALIDATION_ERROR', statusCode: 400 }`. Query via the generated Prisma client: `where: { isArchived: false, OR: [{ userId: null }, { userId }], ...(category && { category }), ...(search && { name: { contains: search, mode: 'insensitive' } }) }`, ordered by name. Respond `res.json({ data: Exercise[] })` with `isPredefined = row.userId === null`; never leak `userId`. Cast `metrics` / `allowedEntryTypes` JSON to the shared types.

#### 2. Router + mount

**File**: `services/training-service/src/routes/exercises.ts` (new) and `services/training-service/src/app.ts`

**Intent**: Expose the controller under `/api/exercises` behind `requireAuth`.

**Contract**: `exercisesRouter.get('/', requireAuth, listExercises)`; in `app.ts` `app.use('/api/exercises', exercisesRouter)`. Follow the auth-service router/mount pattern (`.js` imports).

#### 3. Tests

**File**: `services/training-service/src/__tests__/exercises.test.ts` (new)

**Intent**: Cover auth-gating, the default list, search filter, category filter, ownership scoping, and validation errors.

**Contract**: `vi.mock('../db.js', …)` at top; supertest the `app` export; `await import('../db.js')` for the mocked client. Assert: 401 without token; `{ data: [...] }` with a valid token (mock returns seeded-shaped rows); `search`/`category` are passed into the Prisma `where`; `userId` is never present in response items; an invalid `category` returns `VALIDATION_ERROR` 400. Sign test tokens with `JWT_SECRET` as in `auth-middleware.test.ts`.

### Success Criteria:

#### Automated Verification:

- Tests pass: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual Verification:

- With Postgres seeded and the dev server running (`pnpm --filter @instigi/training-service dev`), `GET http://localhost:4001/api/exercises` with a valid auth-service token returns `{ data: [...8] }`; no `userId` in items.
- `?search=press` and `?category=cardio` narrow results correctly.
- Missing/invalid token returns 401.

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 4.

---

## Phase 4: web-app data layer — `exercisesApi` slice + reusable reauth base query

### Overview

Add a training-service base URL, extract the reauth base-query into a reusable factory, create the `exercisesApi` RTK Query slice, and register it in the store.

### Changes Required:

#### 1. Reusable reauth base query

**File**: `apps/web-app/src/features/api/baseQuery.ts` (new); refactor `apps/web-app/src/features/auth/authApi.ts` to consume it.

**Intent**: Factor the existing `baseQueryWithReauth` (token injection, 401 refresh against auth-service `/refresh`, shared refresh mutex, `tokensRefreshed`/`loggedOut` dispatch) into a factory parameterized by the resource base URL, so both `authApi` and `exercisesApi` reuse one implementation.

**Contract**: Export `createBaseQueryWithReauth(baseUrl: string): BaseQueryFn<...>`. Normal requests hit `baseUrl`; refresh always targets `${VITE_API_URL}/api/auth/refresh`. Preserve the module-level `refreshPromise` mutex so concurrent 401s across APIs serialize on one refresh. `authApi` calls the factory with `${VITE_API_URL}/api/auth` and keeps its existing endpoints/behavior unchanged (its tests must still pass).

#### 2. Exercises API slice + env var

**File**: `apps/web-app/src/features/exercises/exercisesApi.ts` (new); `apps/web-app/src/vite-env.d.ts`; `apps/web-app/.env` (+ `.env.example` if present)

**Intent**: Query the training-service browse endpoint with optional `search`/`category` params, returning the unwrapped `Exercise[]`.

**Contract**: `createApi({ reducerPath: 'exercisesApi', baseQuery: createBaseQueryWithReauth(\`${TRAINING_API_BASE}/api/exercises\`), endpoints: builder => ({ listExercises: builder.query<Exercise[], { search?: string; category?: ExerciseCategory } | void>({ query: (params) => ({ url: '', params }), transformResponse: (r: ApiResponse<Exercise[]>) => r.data }) }) })`. Export `useListExercisesQuery`. `TRAINING_API_BASE = import.meta.env.VITE_TRAINING_API_URL ?? 'http://localhost:4001'`. Add `readonly VITE_TRAINING_API_URL?: string` to `vite-env.d.ts` and `VITE_TRAINING_API_URL=http://localhost:4001` to `.env`.

#### 3. Store wiring

**File**: `apps/web-app/src/store.ts`

**Intent**: Register the exercises API reducer + middleware.

**Contract**: Add `[exercisesApi.reducerPath]: exercisesApi.reducer` to `reducer` and `.concat(exercisesApi.middleware)` to middleware.

### Success Criteria:

#### Automated Verification:

- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Existing web-app tests still pass (auth API unchanged): `pnpm --filter @instigi/web-app test`
- Build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual Verification:

- Redux DevTools shows an `exercisesApi` slice after the page mounts.
- With training-service running, the `listExercises` query resolves with 8 items and no console errors.

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 5.

---

## Phase 5: Wire the exercises page to real data

### Overview

Replace placeholder data with the live query, make search + category controlled, add an error state, and drop the Swimming chip + status select.

### Changes Required:

#### 1. Error state

**File**: `apps/web-app/src/pages/exercises/ExercisesStates.tsx`

**Intent**: Add an error state (alongside the existing empty/loading) with a retry affordance.

**Contract**: Export `ExercisesErrorState({ onRetry }: { onRetry: () => void })` rendering an error message + a retry button. Mirror the visual style of `ExercisesEmptyState`.

#### 2. Toolbar becomes controlled; drop Swimming + status

**File**: `apps/web-app/src/pages/exercises/ExercisesToolbar.tsx`

**Intent**: Make search + category selection controlled via props, align category chips with the data-model taxonomy, and remove the status select.

**Contract**: Props `{ search: string; onSearchChange: (v: string) => void; category: 'all' | ExerciseCategory; onCategoryChange: (c: 'all' | ExerciseCategory) => void }`. `CATEGORY_FILTERS = ['All', 'Strength', 'Cardio', 'Mobility', 'Custom']` (no Swimming); chip `selected` derives from `category`. Remove the `All status / Active / Archived` `Select`. Keep the responsive layout.

#### 3. Table + row typing on shared `Exercise`

**File**: `apps/web-app/src/pages/exercises/ExercisesTable.tsx` (and delete/replace `placeholderExercises.ts`)

**Intent**: Render rows from the shared `Exercise` type, deriving the leading icon and chip color from lowercase `category`, and metric labels from `metricCatalog`.

**Contract**: `ExercisesTableProps { rows: Exercise[] }`. Map lowercase `category` → chip color and → icon (swimming handled as cardio; optional name-based `Pool` icon override). Render metrics as `row.metrics.map(m => metricCatalog[m.key].label).join(', ')`. Remove the dependency on `placeholderExercises.ts` (delete the file and its now-orphaned `PlaceholderExercise`/`ExerciseCategory` exports; update `ExercisesPage`/tests accordingly).

#### 4. Page orchestration

**File**: `apps/web-app/src/pages/ExercisesPage.tsx`

**Intent**: Own search + category state (debounced search), call `useListExercisesQuery`, and render loading / error / empty / data states. Keep "New exercise" disabled.

**Contract**: Local `useState` for `search` and `category`; debounce `search` (~300ms) before passing to the query args `{ search, category: category === 'all' ? undefined : category }`. Render `ExercisesLoading` while `isLoading`/`isFetching` on first load, `ExercisesErrorState` (with `refetch`) on `isError`, `ExercisesEmptyState` when `data.length === 0`, else the `ExercisesTable`. Footer count reflects `data.length`. Keep the disabled New button.

#### 5. Tests

**File**: `apps/web-app/src/pages/ExercisesPage.test.tsx`, `apps/web-app/src/ExercisesRoute.test.tsx` (update)

**Intent**: Keep existing route/page tests green against the new data-driven page (mock the RTK Query hook or MSW the endpoint).

**Contract**: Update tests to provide the store/query mock; assert loading→data render, empty state on no matches, and error state on failure. Follow the existing web-app test setup (Vitest).

### Success Criteria:

#### Automated Verification:

- Web-app tests pass: `pnpm --filter @instigi/web-app test`
- Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- Lint passes: `pnpm --filter @instigi/web-app lint`
- Build succeeds: `pnpm --filter @instigi/web-app build`
- Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual Verification:

- Signed-in user at `/exercises` sees the 8 seeded exercises with correct category chips and metric labels.
- Typing in search filters by name; selecting a category chip filters by category; clearing shows all.
- A query with no matches shows the empty state; a backend failure shows the error state with a working retry.
- No "Swimming" chip; no status select; "New exercise" remains disabled.
- `docker compose up` boots, migrates + seeds the `training` schema, and the page works end-to-end with no regressions in auth / web-app.

**Implementation Note**: After automated verification passes, pause for final manual confirmation.

---

## Testing Strategy

### Unit Tests:

- Exercises controller: query-param validation (valid/invalid category), `where` construction for search/category, ownership scoping (`userId null OR caller`), DTO mapping (no `userId` leak).
- Frontend: page state transitions (loading/error/empty/data), search debounce → query args, category chip selection → query args.

### Integration Tests:

- training-service supertest: auth-gated `GET /api/exercises` returns `{ data }`, filters apply, 401 without token (per `services/AGENTS.md` supertest+`vi.mock('../db.js')` pattern).
- web-app: `/exercises` route renders the data-driven page under `ProtectedRoute` (`ExercisesRoute.test.tsx`).

### Manual Testing Steps:

1. `docker compose up -d postgres`, run `db:migrate` + `db:seed` for training-service.
2. Start auth-service + training-service + web-app dev servers; sign in.
3. Navigate to `/exercises`; confirm 8 exercises render with labels/chips.
4. Search "press" → only Bench Press; pick "Cardio" → Running/Cycling/Swimming.
5. Search gibberish → empty state; stop training-service → error state + retry.
6. Confirm no Swimming chip, no status select, New disabled.

## Performance Considerations

The seed set is tiny (8 rows); server-side filtering with the `(user_id)` / `(user_id, is_archived)` indexes is more than sufficient. Debounce search input (~300ms) to avoid a request per keystroke.

## Migration Notes

First model in `training-service`. `db:migrate` creates `training.exercise_definitions`; the seed is idempotent (upsert on the global natural key) so migrate-on-boot in compose is safe to re-run. No existing data to migrate.

## References

- Roadmap item: `context/foundation/roadmap.md` → S-01
- Data model: `context/foundation/data-model.md` (enums, `metricCatalog`, DDL, seed list)
- PRD: `context/foundation/prd.md` → US-01, FR-008
- Backend pattern: `services/auth-service/src/controllers/auth.ts`, `services/auth-service/src/routes/auth.ts`, `services/auth-service/src/__tests__/auth.test.ts`
- Shared auth: `packages/utils/src/middleware/auth.ts`
- Frontend data pattern: `apps/web-app/src/features/auth/authApi.ts`, `apps/web-app/src/store.ts`
- Service rules: `services/AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared exercise contract (`@instigi/types` + `@instigi/utils`)

#### Automated

- [x] 1.1 Types package builds: `pnpm --filter @instigi/types build` — 7715c1e
- [x] 1.2 Utils package builds: `pnpm --filter @instigi/utils build` — 7715c1e
- [x] 1.3 Utils tests pass (if present): `pnpm --filter @instigi/utils test` — 7715c1e
- [x] 1.4 Workspace typecheck passes: `pnpm typecheck` — 7715c1e

#### Manual

- [x] 1.5 `metricCatalog` labels/units match `context/foundation/data-model.md` — 7715c1e

### Phase 2: training-service data model — `ExerciseDefinition` + migration + seed

#### Automated

- [x] 2.1 Prisma client generates: `pnpm --filter @instigi/training-service db:generate` — c946504
- [x] 2.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck` — c946504
- [x] 2.3 Lint passes: `pnpm --filter @instigi/training-service lint` — c946504
- [x] 2.4 Build succeeds: `pnpm --filter @instigi/training-service build` — c946504

#### Manual

- [x] 2.5 `db:migrate` creates `training.exercise_definitions` (psql/pgAdmin) — c946504
- [x] 2.6 `db:seed` inserts 8 rows with `user_id IS NULL`; re-running does not duplicate — c946504
- [x] 2.7 Seeded categories/metrics match the data-model summary (swimming = cardio) — c946504

### Phase 3: training-service browse endpoint — `GET /api/exercises`

#### Automated

- [x] 3.1 Tests pass: `pnpm --filter @instigi/training-service test` — 56d059a
- [x] 3.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck` — 56d059a
- [x] 3.3 Lint passes: `pnpm --filter @instigi/training-service lint` — 56d059a

#### Manual

- [x] 3.4 `GET /api/exercises` with a valid token returns `{ data: [...8] }`; no `userId` in items — 56d059a
- [x] 3.5 `?search=press` and `?category=cardio` narrow results correctly — 56d059a
- [x] 3.6 Missing/invalid token returns 401 — 56d059a

### Phase 4: web-app data layer — `exercisesApi` slice + reusable reauth base query

#### Automated

- [x] 4.1 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [x] 4.2 Lint passes: `pnpm --filter @instigi/web-app lint`
- [x] 4.3 Existing web-app tests still pass: `pnpm --filter @instigi/web-app test`
- [x] 4.4 Build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual

- [ ] 4.5 Redux DevTools shows an `exercisesApi` slice after the page mounts
- [ ] 4.6 `listExercises` query resolves with 8 items, no console errors

### Phase 5: Wire the exercises page to real data

#### Automated

- [ ] 5.1 Web-app tests pass: `pnpm --filter @instigi/web-app test`
- [ ] 5.2 Typecheck passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 5.3 Lint passes: `pnpm --filter @instigi/web-app lint`
- [ ] 5.4 Build succeeds: `pnpm --filter @instigi/web-app build`
- [ ] 5.5 Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual

- [ ] 5.6 Signed-in user sees 8 seeded exercises with correct chips + metric labels
- [ ] 5.7 Search filters by name; category chip filters by category; clearing shows all
- [ ] 5.8 No-match shows empty state; backend failure shows error state + working retry
- [ ] 5.9 No Swimming chip, no status select, New disabled
- [ ] 5.10 `docker compose up` migrates + seeds and the page works end-to-end; no auth/web-app regressions
