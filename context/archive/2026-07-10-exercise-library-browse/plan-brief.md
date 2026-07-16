# Exercise Library Browse — Plan Brief

> Full plan: `context/changes/exercise-library-browse/plan.md`

## What & Why

Deliver S-01, the first user-visible workout slice: a signed-in user opens the exercises page and browses a real, predefined, metric-configured exercise library served by the F-01 `training-service`, searchable by name and filterable by category. This seeds the metric-configured exercise data the whole logging flow (S-02–S-04) depends on — you can't add exercises you can't see.

## Starting Point

F-02 already built the exercises page shell (`ExercisesPage` + toolbar + table + loading/empty states) but it renders hardcoded placeholder data with non-functional filters. F-01 stood up `training-service` (port 4001) with `/health`, shared `requireAuth`, and a Prisma `training` schema that has **zero models**. Shared `@instigi/types`/`@instigi/utils` have no exercise types yet.

## Desired End State

Navigating to `/exercises` shows the 8 predefined exercises fetched live from `training-service`, each with a category chip and human-readable metric labels ("Reps, Weight"). Search filters by name (server-side), category chips filter by category, and the page shows proper loading, empty, and error (with retry) states. "New exercise" stays disabled.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Library ownership | Nullable `userId`: `null` = global predefined, set = user-owned | Predefined list is shared by all; users get their own later without a schema change | Plan |
| This slice's scope | Browse global + caller's own; no create/edit/archive | S-01 is read-only; "New" button stays disabled | Plan |
| Filtering | Server-side via `search` / `category` query params | Correct + future-proof; aligns with the API | Plan |
| Enum/label shape | Lowercase enums in `@instigi/types`; runtime `metricCatalog` in `@instigi/utils` | One source of truth; labels ("Weight") come from the catalog, not keys | Plan |
| Category taxonomy | Follow data model (swimming = cardio); drop "Swimming" chip + status select | Reconciles the F-02 shell mismatch with the data model | Plan |
| Seed set | The 8-exercise set from `data-model.md` verbatim | Enough for MVP; matches documented model | Plan |

## Scope

**In scope:** exercise types + metric catalog in shared packages; `ExerciseDefinition` Prisma model + migration + idempotent seed; authenticated `GET /api/exercises` with search/category; web-app `exercisesApi` slice; wiring the page to real data with loading/empty/error states.

**Out of scope:** user-created exercises (create/edit/archive), workout sessions/entries (S-02+), `rpe`/`calories` metrics, status filter, unit conversion, routing/auth-service changes.

## Architecture / Approach

Bottom-up in 5 phases: (1) shared contract → (2) backend data (model/migration/seed) → (3) backend endpoint → (4) frontend data layer → (5) UI wiring. The browse endpoint sits behind `requireAuth` and returns `{ data: Exercise[] }` where the row set is `userId IS NULL OR userId = caller`. The web-app reuses the existing RTK Query reauth pattern via an extracted base-query factory pointed at a new `VITE_TRAINING_API_URL` (dev `localhost:4001`), refreshing tokens against auth-service.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared contract | Exercise enums/DTO in `@instigi/types`; `metricCatalog` in `@instigi/utils` | Keeping catalog faithful to the data model |
| 2. Data model | First Prisma model + migration + idempotent 8-exercise seed | Seed idempotency; `training` schema mapping |
| 3. Browse endpoint | Authenticated `GET /api/exercises` + search/category + tests | Ownership scoping; no `userId` leak |
| 4. Frontend data layer | Reusable reauth base query + `exercisesApi` + store wiring | Shared refresh mutex across two API base URLs |
| 5. UI wiring | Controlled search/category, error state, drop Swimming/status | Existing page/route tests staying green |

**Prerequisites:** F-01 (workout-service-scaffold) and F-02 (exercises-page-layout), both archived; Postgres running for migrate/seed.
**Estimated effort:** ~2–3 sessions across 5 phases.

## Open Risks & Assumptions

- Assumes the extracted reauth base query can serve two origins while refreshing only against auth-service; the module-level refresh mutex must be preserved so concurrent 401s don't double-refresh.
- Assumes enums stored as `String` columns (validated by Zod) rather than Postgres enums, to avoid enum-migration friction.
- Compose migrate-on-boot must invoke the seed; the seed must stay idempotent for repeat boots.

## Success Criteria (Summary)

- A signed-in user browses the 8 seeded exercises with correct categories and metric labels, and can search + filter by category.
- Loading, empty (no matches), and error (with retry) states all behave; "New exercise" stays disabled; no Swimming chip / status select.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green; `docker compose up` migrates + seeds and the page works end-to-end with no auth/web-app regressions.
