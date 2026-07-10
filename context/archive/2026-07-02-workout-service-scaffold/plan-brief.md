# Training Service Scaffold (F-01) — Plan Brief

> Full plan: `context/changes/workout-service-scaffold/plan.md`

## What & Why

Stand up a new dedicated `training-service` (Express 5 + Prisma 7, ESM, port 4001) next to `auth-service`, with its own `training` Postgres schema and the ability to verify auth-service-issued JWTs. This is F-01, the foundation that unlocks every workout slice (S-01–S-04): no user-facing workout capability can persist data or identify its owner until this service exists. We also extract the cross-service auth primitives (`verifyAccessToken` + the `requireAuth` middleware) out of `auth-service` into a new `@instigi/utils` package so both services share one implementation; token minting stays in `auth-service`.

## Starting Point

`auth-service` is the only backend (port 4000, `auth` Postgres schema). It signs access tokens symmetrically (HS256) with `JWT_SECRET`, and has `requireAuth` middleware plus a clean, copyable layout (tsconfig trio, Prisma driver-adapter `db.ts`, Vitest+supertest, multi-stage Dockerfile). `packages/types` is the reference for a shared workspace library. Compose + Caddy already orchestrate the stack.

## Desired End State

A `@instigi/utils` package owns `verifyAccessToken` + the `requireAuth` middleware, consumed by both services (auth-service keeps its token minting). `training-service` builds, boots on 4001, serves `/health`, owns an empty `training` schema (a hand-authored baseline migration creates the schema, no tables), and verifies auth-service tokens via the shared secret. The service is wired into Docker Compose, Caddy, env, and README. Whole-workspace `lint/typecheck/test/build` are green.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Data isolation | Same Postgres container, new `training` schema | New tables only; auth schema untouched | Plan |
| JWT verification | Share `JWT_SECRET`, verify HS256 | auth-service already signs symmetrically; no callback needed | Plan |
| Name / port | `training-service` on 4001 | User choice; 4000 taken by auth | Plan |
| Initial schema | Empty (schema only, no models) | Roadmap: keep minimal; S-01 owns Exercise | Plan |
| Ownership modelling | Store JWT `userId` as plain string; no local User table / FK | User lives in auth service; no cross-service FK | Plan |
| /health | Static `{ status, service }` | Mirror auth-service | Plan |
| Test scope | Health + `requireAuth` (valid/missing/invalid) via in-test probe | Cover the one non-trivial behaviour without polluting `app.ts` | Plan |
| De-duplication | Extract `verifyAccessToken` + `requireAuth` to `@instigi/utils` | Avoid two copies once a second consumer exists; minting stays in auth-service | Plan (user-requested) |

## Scope

**In scope:** new `@instigi/utils` package (`verifyAccessToken` + `requireAuth`); auth-service edit to consume it (minting stays local; controllers/routes untouched); `training-service` package (configs, empty Prisma schema + hand-authored baseline migration, `db.ts`, `app.ts` health, `index.ts`); JWT/middleware wiring + tests; Dockerfile; compose/Caddy/env/README wiring.

**Out of scope:** any workout/exercise/session/set models; local User table or cross-service FK; token minting in training-service; changes to auth-service’s public API or `auth` schema; asymmetric keys / introspection; CI.

## Architecture / Approach

`@instigi/utils` (built like `packages/types`, externalizing `express`/`jsonwebtoken`) exports `verifyAccessToken`, `TokenPayload`, `requireAuth`, `AuthRequest`. Both services consume it; auth-service retains `generateTokens`/`verifyRefreshToken`. `training-service` mirrors `auth-service`: Express `app` with `/health`, Prisma via PrismaPg adapter against `?schema=training`, tokens verified with the shared `JWT_SECRET`. Compose runs `prisma migrate deploy` on boot; Caddy exposes `training-api.instigi.com`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Extract `@instigi/utils` | `verifyAccessToken` + `requireAuth` package; auth-service consumes it | Import breakage — guarded by auth-service’s existing tests + Dockerfile update |
| 2. Scaffold training-service | Package builds & boots on 4001; empty `training` schema via hand-authored migration | Prisma won't auto-create a zero-model schema; correct generated-client path |
| 3. JWT wiring + tests | `requireAuth` covered (valid/missing/invalid) | Cross-service token verification depends on shared secret env |
| 4. Container & compose wiring | Runs in the Docker stack; documented | Dockerfile must build both shared packages; Caddy/compose regressions |

**Prerequisites:** running Postgres for migrate/dev verification; present auth + Postgres baseline (already in place).
**Estimated effort:** ~1–2 sessions across 4 phases; mostly mirroring existing patterns.

## Open Risks & Assumptions

- Assumes `JWT_SECRET` is provisioned identically for both services in every environment (it already is in root `.env`/compose).
- Extraction moves working code; the main risk is missed importers/Docker copy steps — caught by typecheck + auth-service tests + image build.
- A zero-model Prisma schema will NOT auto-create `training`; the baseline migration is hand-authored to run `CREATE SCHEMA IF NOT EXISTS "training"`, verified manually.

## Success Criteria (Summary)

- `training-service` boots on 4001 and `/health` returns `{ status: 'ok', service: 'training-service' }`.
- A real auth-service access token verifies in the training service via `requireAuth`.
- `@instigi/utils` is the single source of `verifyAccessToken` + `requireAuth`; auth-service tests stay green; whole-workspace `lint/typecheck/test/build` and `docker compose build training-service` succeed.
