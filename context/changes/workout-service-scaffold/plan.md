# Training Service Scaffold (F-01) Implementation Plan

## Overview

Stand up a new dedicated `training-service` (Express 5 + Prisma 7, ESM, port 4001) alongside the existing `auth-service`, connected to its own `training` Postgres schema, able to verify auth-service-issued JWTs, and reachable through the existing container/compose/Caddy wiring. As part of this work, extract the cross-service auth primitives (`verifyAccessToken` and the `requireAuth` middleware) out of `auth-service` into a new `@instigi/utils` package so both services share one implementation instead of duplicating it; token minting stays in `auth-service`. No workout domain models are created here — S-01 owns the first `Exercise` model.

## Current State Analysis

- `services/auth-service` is the only backend service. It exposes `/health` and `/api/auth` (`login`, `register`, `refresh`) on port 4000 and owns Postgres schema `auth` (`?schema=auth`).
- JWT handling is **symmetric (HS256)**: `services/auth-service/src/jwt.ts` signs access tokens with `process.env.JWT_SECRET`. Verifying an access token elsewhere requires only that same secret (`jwt.verify(token, JWT_SECRET)`). `JWT_SECRET` already exists in the root `.env` and is injected into the `auth-service` container in `docker-compose.yml`.
- `services/auth-service/src/middleware/auth.ts` implements `requireAuth` (Bearer parse → `verifyAccessToken` → `req.user`) returning the strict error shape `{ message, code, statusCode }`.
- Prisma is wired via the driver adapter pattern (`services/auth-service/src/db.ts` uses `PrismaPg` + generated client from `./generated/prisma/client.js`), configured by `prisma.config.ts` reading `DATABASE_URL`.
- Build tooling is per-package: tsconfig trio (`tsconfig.json` / `.build.json` / `.test.json`), `vitest.config.ts` (globals, node env), Vitest + supertest against the exported `app`.
- `packages/types` is the reference for a shared workspace library: `type: module`, dual ESM/CJS + `.d.ts` output via `vite` + `vite-plugin-dts` (`packages/types/vite.config.ts`), consumed as `@instigi/types` (`workspace:*`) with a tsconfig project reference.
- Monorepo orchestration: `pnpm-workspace.yaml` globs `packages/*` and `services/*`; `turbo.json` runs `build`/`test`/`lint`/`typecheck` with `^build` dependencies; `docker-compose.yml` builds each service from a dedicated Dockerfile and runs `prisma migrate deploy` before start.
- Caddy (`caddy/Caddyfile`) routes by hostname; `api.instigi.com → auth-service:4000`.

### Key Discoveries:

- **Shared-secret verification is sufficient** — `services/auth-service/src/jwt.ts:26` verifies with `JWT_SECRET`; the training service needs the same env var and no call back to auth-service. This resolves the roadmap's only open unknown.
- **Multi-schema, single database** — `docker-compose.yml:34` shows auth uses `...@postgres:5432/${POSTGRES_DB}?schema=auth`; the training service reuses the same Postgres container/db with `?schema=training`, satisfying "new dedicated service / new tables only / auth-service unchanged."
- **`packages/types` is the exact template** for `@instigi/utils` build config (`packages/types/vite.config.ts`, `packages/types/tsconfig.json` with `composite: true`).
- **auth-service is the exact template** for the new service’s file layout, tsconfig trio, Dockerfile (`services/auth-service/Dockerfile`), and test harness (`services/auth-service/src/__tests__/health.test.ts`).
- **AGENTS.md rules are binding**: `.js` import extensions, `{ data: T }` / `{ message, code, statusCode }` shapes, Zod `.safeParse` for any controller input, Prisma client imported from `./generated/prisma/client.js`, `DATABASE_URL` must carry `?schema=<name>`.

## Desired End State

- A new `packages/utils` (`@instigi/utils`) package exports the cross-service auth primitives: `verifyAccessToken`, `TokenPayload`, `requireAuth`, and `AuthRequest`. `auth-service` keeps `generateTokens`/`verifyRefreshToken` in its own `src/jwt.ts` (importing `TokenPayload` from the package) and deletes its local `src/middleware/auth.ts`; `controllers/auth.ts` and `routes/auth.ts` are untouched, and all existing auth-service tests still pass.
- A new `services/training-service` (`@instigi/training-service`) builds, typechecks, lints, and boots on port 4001; `GET /health` returns `{ status: 'ok', service: 'training-service' }`.
- The training service owns Postgres schema `training`; a hand-authored baseline Prisma migration creates that schema with no domain tables.
- The training service verifies auth-service JWTs via `requireAuth` from `@instigi/utils`; middleware behaviour is covered by tests (valid / missing / invalid token).
- `docker-compose.yml`, `caddy/Caddyfile`, root `.env.example`, and `README.md` are updated so the service runs in the container stack and is documented. `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` are green across the workspace.

**Verification:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` succeed from repo root; `pnpm --filter @instigi/training-service dev` serves `/health` on 4001; `docker compose build training-service` succeeds.

## What We're NOT Doing

- No workout/session/exercise/set Prisma models (owned by S-01+). The baseline migration creates only the empty `training` schema.
- No local `User` table or cross-service foreign key. Future workout rows will store the JWT `userId` as a plain string (decided; implemented when S-02 adds the session model).
- No token **minting** in the training service and no changes to auth-service’s public API contracts or its `auth` schema.
- No new business endpoints beyond `/health` (the protected probe route used to test `requireAuth` lives only inside the test file, not in `app.ts`).
- No switch to asymmetric keys or an introspection endpoint; verification stays HS256 shared-secret.
- No CI workflow changes (none exist yet).

## Implementation Approach

Work in dependency order so existing code stays green at every step:

1. **De-duplicate first** — lift the cross-service `verifyAccessToken` + `requireAuth` middleware into `@instigi/utils` and update `auth-service`'s `jwt.ts` to reuse the shared `TokenPayload` while keeping its minting functions. This keeps a single source of truth before a second consumer exists, and is verified by auth-service’s existing tests.
2. **Scaffold the service shell** — mirror auth-service’s package/config/Prisma/db/app/index files with an empty `training` schema; prove it builds and boots with `/health`.
3. **Wire auth into the service** — consume `requireAuth`/`verifyAccessToken` from `@instigi/utils` and cover the middleware with tests.
4. **Wire the stack** — Dockerfile, compose service block, Caddy route, env, and docs so it runs in the container environment.

## Critical Implementation Details

- **Vite `external` for `@instigi/utils`** — unlike `packages/types` (pure types, `external: []`), utils has a runtime dep. Its `vite.config.ts` must externalize `jsonwebtoken` (the only runtime import) so it is not bundled: `rollupOptions.external: ['express', 'jsonwebtoken']`. `express` is imported type-only (erased at build), so listing it is defensive/harmless — the load-bearing entry is `jsonwebtoken`.
- **auth-service Dockerfile gains a new dependency** — once auth-service imports `@instigi/utils`, its Dockerfile (`services/auth-service/Dockerfile`) must COPY `packages/utils` and build it before building auth-service, exactly as it already does for `packages/types`. Missing this breaks the production image even though local dev works.
- **Prisma will NOT auto-create an empty schema** — Prisma only emits schema DDL for schemas that contain at least one `@@schema`-tagged object. A `schemas = ["training"]` datasource with zero models yields "No schema change" and writes **no** migration file, so `prisma migrate dev --create-only` produces nothing to edit. There is also **no existing migration anywhere in the repo** to copy (auth-service has no `prisma/migrations` directory). Therefore **hand-author the entire baseline migration folder** rather than trying to edit generated output:
  - `prisma/migrations/<timestamp>_init/migration.sql` containing exactly `CREATE SCHEMA IF NOT EXISTS "training";` (no tables).
  - `prisma/migrations/migration_lock.toml` containing `provider = "postgresql"` — **required**, or `prisma migrate deploy` errors / ignores the folder.
  Use a timestamp of the form `YYYYMMDDHHMMSS_init`. Then run `prisma migrate deploy` (or `db:migrate`) so the schema is provisioned deterministically on boot; the exact `_prisma_migrations` bookkeeping location for the freshly-created schema is worth a manual check on first run.

## Phase 1: Extract shared auth/JWT utilities into `@instigi/utils`

### Overview

Create `packages/utils`, move only `verifyAccessToken` (the cross-service piece) and the `requireAuth` middleware there, and update `auth-service`'s `jwt.ts` to keep its token-minting functions while importing `TokenPayload` from the package. `controllers/auth.ts` and `routes/auth.ts` are left untouched. auth-service's existing tests prove no behaviour changed.

### Changes Required:

#### 1. New shared package

**File**: `packages/utils/package.json`

**Intent**: Declare `@instigi/utils` as a dual ESM/CJS + types workspace library mirroring `@instigi/types`, but with the runtime deps its code needs.

**Contract**: `name: "@instigi/utils"`, `type: "module"`, same `main`/`module`/`types`/`exports` block as `packages/types/package.json`; scripts `build` (`vite build`), `lint`, `typecheck`, `clean`; `dependencies`: `jsonwebtoken`; `devDependencies`: `express`, `@types/express`, `@types/jsonwebtoken`, `typescript`, `vite`, `vite-plugin-dts` (versions matching auth-service / types). No `@instigi/types` dependency — the extracted surface (`verifyAccessToken`, `TokenPayload`, `requireAuth`) does not use `AuthTokens`.

**File**: `packages/utils/vite.config.ts`

**Intent**: Build config mirroring `packages/types/vite.config.ts` but externalizing runtime deps.

**Contract**: Same structure as the types vite config; `rollupOptions.external: ['express', 'jsonwebtoken']`.

**File**: `packages/utils/tsconfig.json`

**Intent**: Composite project config so consumers can reference it.

**Contract**: Copy of `packages/types/tsconfig.json` (`extends ../../tsconfig.base.json`, `outDir: dist`, `rootDir: src`, `composite: true`, `include: ["src"]`).

#### 2. Extracted verify + middleware source

**File**: `packages/utils/src/jwt.ts`

**Intent**: Host only the cross-service verification piece — the function the training service needs.

**Contract**: Defines and exports `TokenPayload` (`{ userId, email, role }`) and `verifyAccessToken(token): TokenPayload`; reads `JWT_SECRET` from `process.env` **inside the function at call time** (not captured at module load — a module-scoped constant would be read before tests can set `process.env.JWT_SECRET`, causing a secret mismatch). Does NOT include `generateTokens` / `verifyRefreshToken` (those stay in auth-service).

**File**: `packages/utils/src/middleware/auth.ts`

**Intent**: Host `requireAuth` + `AuthRequest` currently in `services/auth-service/src/middleware/auth.ts`.

**Contract**: Exports `AuthRequest` and `requireAuth(req, res, next)`; imports `verifyAccessToken` from `../jwt.js`; preserves the exact 401 error shapes (`UNAUTHORIZED`, `INVALID_TOKEN`).

**File**: `packages/utils/src/index.ts`

**Intent**: Public barrel for the package.

**Contract**: Re-exports everything from `./jwt.js` (`verifyAccessToken`, `TokenPayload`) and `./middleware/auth.js` (`requireAuth`, `AuthRequest`).

#### 3. auth-service refactor to consume the package

**File**: `services/auth-service/package.json`

**Intent**: Add the new dependency.

**Contract**: Add `"@instigi/utils": "workspace:*"` to `dependencies`.

**File**: `services/auth-service/src/jwt.ts`

**Intent**: Keep token minting local; drop the now-shared verify function and reuse the shared `TokenPayload`.

**Contract**: Remove `verifyAccessToken` (moved to the package). Keep `generateTokens` and `verifyRefreshToken` unchanged. Replace the local `TokenPayload` interface with `import type { TokenPayload } from '@instigi/utils';` (and continue importing `AuthTokens` from `@instigi/types`). `controllers/auth.ts` (which imports `generateTokens`/`verifyRefreshToken` from `../jwt.js`) and `routes/auth.ts` remain byte-for-byte unchanged.

**File**: `services/auth-service/src/middleware/auth.ts`

**Intent**: Remove the duplicated middleware now living in the package.

**Contract**: Delete the file. No auth-service code imports it (routes/controllers don't use `requireAuth`), so nothing else changes.

**File**: `services/auth-service/tsconfig.json`

**Intent**: Add a project reference so incremental builds resolve the package.

**Contract**: Add `{ "path": "../../packages/utils" }` to `references` (alongside the existing types reference).

**File**: `services/auth-service/Dockerfile`

**Intent**: Ensure the production image builds the new dependency (see Critical Implementation Details).

**Contract**: Add `COPY packages/utils/package.json ./packages/utils/` in the deps stage, add `packages/utils` to the `--filter` install, `COPY packages/utils ./packages/utils`, and `RUN pnpm --filter @instigi/utils build` before the auth-service build; copy `packages/utils` into the runner stage as done for `packages/types`.

### Success Criteria:

#### Automated Verification:

- Dependencies install: `pnpm install`
- utils package builds: `pnpm --filter @instigi/utils build`
- auth-service typecheck passes: `pnpm --filter @instigi/auth-service typecheck`
- auth-service lint passes: `pnpm --filter @instigi/auth-service lint`
- auth-service tests pass unchanged: `pnpm --filter @instigi/auth-service test`
- auth-service builds: `pnpm --filter @instigi/auth-service build`
- No lingering imports of the moved symbols: `grep -Rn "verifyAccessToken\|middleware/auth" services/auth-service/src` returns nothing (verify still comes from the package; `controllers/auth.ts` and `routes/auth.ts` are unchanged; `middleware/auth.ts` is deleted)

#### Manual Verification:

- `pnpm --filter @instigi/auth-service dev` still serves login/register/refresh against a running Postgres (behaviour unchanged).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Scaffold `training-service` shell

### Overview

Create the new service package that installs, builds, and boots on port 4001 with a `/health` endpoint and an empty `training` Prisma schema.

### Changes Required:

#### 1. Package & build tooling

**File**: `services/training-service/package.json`

**Intent**: Declare `@instigi/training-service` mirroring auth-service’s package minus auth-only deps.

**Contract**: `name: "@instigi/training-service"`, `type: "module"`, scripts identical to `services/auth-service/package.json` (`dev`, `build`, `start`, `test`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:push`, `db:studio`, `clean`); `dependencies`: `@instigi/types`, `@instigi/utils` (both `workspace:*`), `@prisma/adapter-pg`, `@prisma/client`, `cors`, `dotenv`, `express`, `prisma`, `zod`; `devDependencies` mirroring auth-service (types, supertest, vitest, tsx, typescript) plus `jsonwebtoken` + `@types/jsonwebtoken` (used only by the middleware test to mint a token). Omit `bcryptjs`; the service has no runtime `jsonwebtoken` dependency (verification comes from `@instigi/utils`).

**File**: `services/training-service/tsconfig.json`, `tsconfig.build.json`, `tsconfig.test.json`

**Intent**: Copy the auth-service tsconfig trio, adjusting project references.

**Contract**: Same as `services/auth-service/tsconfig.*`; `references` include `{ "path": "../../packages/types" }` and `{ "path": "../../packages/utils" }`.

**File**: `services/training-service/vitest.config.ts`

**Intent**: Test config.

**Contract**: Identical to `services/auth-service/vitest.config.ts`.

**File**: `services/training-service/.env.example`

**Intent**: Document required env for local dev.

**Contract**: `PORT=4001`, `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/instigi_db?schema=training"`, `JWT_SECRET="change-me-in-production"`.

#### 2. Prisma (empty schema)

**File**: `services/training-service/prisma/schema.prisma`

**Intent**: Configure Prisma for the `training` schema with the generated-client output path, no models yet.

**Contract**: `generator client` with `provider = "prisma-client"`, `output = "../src/generated/prisma"`; `datasource db` `provider = "postgresql"`, `schemas = ["training"]`. No models/enums.

**File**: `services/training-service/prisma.config.ts`

**Intent**: Prisma config.

**Contract**: Identical to `services/auth-service/prisma.config.ts` (schema path, migrations path, `env('DATABASE_URL')`).

**File**: `services/training-service/prisma/migrations/**` (generated)

**Intent**: Baseline migration that provisions the empty `training` schema (Prisma won't do this automatically — see Critical Implementation Details).

**Contract**: **Hand-authored** (Prisma generates no file for an empty schema — see Critical Implementation Details). Create `prisma/migrations/<YYYYMMDDHHMMSS>_init/migration.sql` whose entire body is `CREATE SCHEMA IF NOT EXISTS "training";` (no tables), **and** `prisma/migrations/migration_lock.toml` with `provider = "postgresql"`. Apply with `prisma migrate deploy` (or `db:migrate`).

#### 3. Runtime source

**File**: `services/training-service/src/db.ts`

**Intent**: Prisma client via PrismaPg adapter.

**Contract**: Identical to `services/auth-service/src/db.ts` (imports generated client from `./generated/prisma/client.js`).

**File**: `services/training-service/src/app.ts`

**Intent**: Express app exporting `app` with `/health` only.

**Contract**: `cors()` + `express.json()`; `GET /health` → `{ status: 'ok', service: 'training-service' }`. No routers mounted yet.

**File**: `services/training-service/src/index.ts`

**Intent**: Boot the server.

**Contract**: Identical to `services/auth-service/src/index.ts` but `PORT` defaults to 4001 and log message names the training service.

### Success Criteria:

#### Automated Verification:

- Install succeeds: `pnpm install`
- Prisma client generates: `pnpm --filter @instigi/training-service db:generate`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`
- Build succeeds: `pnpm --filter @instigi/training-service build`

#### Manual Verification:

- With Postgres running, `pnpm --filter @instigi/training-service db:migrate` applies the hand-authored baseline and creates the `training` schema (verify in pgAdmin/psql: schema exists, no tables; a `_prisma_migrations` row is recorded).
- `pnpm --filter @instigi/training-service dev` boots on 4001; `curl localhost:4001/health` → `{"status":"ok","service":"training-service"}`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Wire JWT verification + tests

### Overview

Confirm the service can protect routes with auth-service JWTs via `@instigi/utils`, and cover `/health` and `requireAuth` with tests.

### Changes Required:

#### 1. Health test

**File**: `services/training-service/src/__tests__/health.test.ts`

**Intent**: Mirror auth-service’s health test for the new service name.

**Contract**: supertest `GET /health` → 200 and body `{ status: 'ok', service: 'training-service' }`.

#### 2. requireAuth middleware test

**File**: `services/training-service/src/__tests__/auth-middleware.test.ts`

**Intent**: Prove the shared `requireAuth` accepts a valid auth-service token and rejects missing/invalid tokens, using a probe route mounted inside the test only.

**Contract**: Build a minimal Express app in the test: `app.get('/__probe', requireAuth, (req, res) => res.json({ data: { userId: req.user?.userId } }))` (use optional chaining — `AuthRequest.user` is typed optional, so `req.user.userId` fails typecheck under `strict`/`exactOptionalPropertyTypes`). Import `requireAuth` from `@instigi/utils`. Mint the test token by signing directly with `jsonwebtoken` (`jwt.sign({ userId, email, role }, process.env.JWT_SECRET)`) — `generateTokens` lives in auth-service, not the package — after setting `process.env.JWT_SECRET`. Cases: (a) valid Bearer token → 200 with the payload `userId`; (b) no `Authorization` header → 401 `{ code: 'UNAUTHORIZED' }`; (c) malformed/invalid token → 401 `{ code: 'INVALID_TOKEN' }`. The probe route exists only here — not in `src/app.ts`.

### Success Criteria:

#### Automated Verification:

- Tests pass: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`

#### Manual Verification:

- Obtain a real access token from a running auth-service (`POST /api/auth/login`), then confirm the probe pattern by temporarily cur\ling a protected route wired the same way returns the userId — confirming cross-service tokens verify with the shared secret.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Container & compose wiring

### Overview

Make the service part of the container stack and document it.

### Changes Required:

#### 1. Dockerfile

**File**: `services/training-service/Dockerfile`

**Intent**: Multi-stage build mirroring auth-service, including the `@instigi/utils` and `@instigi/types` packages.

**Contract**: Copy of `services/auth-service/Dockerfile` with `auth-service` → `training-service`, `EXPOSE 4001`, and deps/build/runner stages that COPY + build `packages/types` and `packages/utils` before building the service (same pattern as Phase 1’s auth Dockerfile change).

#### 2. Compose service block

**File**: `docker-compose.yml`

**Intent**: Add a `training-service` service and make the frontends depend on it.

**Contract**: New `training-service` block mirroring `auth-service`: build from `services/training-service/Dockerfile`; env `NODE_ENV`, `PORT: 4001`, `DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=training`, `JWT_SECRET: ${JWT_SECRET}`; `command: sh -c "node_modules/.bin/prisma migrate deploy && node dist/index.js"`; `depends_on: postgres (service_healthy)`. Add `training-service` to `web-app` and `caddy` `depends_on`.

#### 3. Caddy route

**File**: `caddy/Caddyfile`

**Intent**: Expose the service on its own subdomain.

**Contract**: Add `training-api.instigi.com { reverse_proxy training-service:4001 }`.

#### 4. Env + docs

**File**: `.env.example`

**Intent**: Document that the shared `JWT_SECRET` also drives the training service (no new secret needed) and note the `training` schema.

**Contract**: Add a "Training Service" comment section noting it reuses `POSTGRES_*` + `JWT_SECRET`; no new variables required.

**File**: `README.md`

**Intent**: Document the new service in the structure, local-URL, dev, migrate, and deployment/subdomain tables.

**Contract**: Add `services/training-service # Express 5 + Prisma 7 (port 4001)` to the tree; add `training-service → http://localhost:4001` to local URLs; add `pnpm --filter @instigi/training-service db:migrate` and dev commands; add `training-api.instigi.com → training-service` to the deployment subdomain table; note first-start `prisma migrate deploy`.

### Success Criteria:

#### Automated Verification:

- Whole workspace is green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Image builds: `docker compose build training-service`
- Caddyfile parses: `docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile` (or `docker run --rm -v "$PWD/caddy/Caddyfile:/etc/caddy/Caddyfile" caddy caddy validate --config /etc/caddy/Caddyfile`)

#### Manual Verification:

- `docker compose up -d postgres training-service` starts the service; it runs `prisma migrate deploy` and creates the `training` schema; `curl localhost:<mapped>/health` (or via Caddy) returns ok.
- Existing `auth-service`, `web-app`, `admin-app` still start and function (no regressions).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the full stack works.

---

## Testing Strategy

### Unit Tests:

- `training-service` `/health` returns the correct static body.
- `requireAuth` (from `@instigi/utils`): valid token → `req.user` populated (200); missing header → 401 `UNAUTHORIZED`; invalid token → 401 `INVALID_TOKEN`.
- auth-service existing test suite continues to pass after the extraction (regression guard for Phase 1).

### Integration Tests:

- Cross-service token flow (manual): a token minted by auth-service verifies in the training service using the shared `JWT_SECRET`.

### Manual Testing Steps:

1. `docker compose up -d postgres` then `pnpm --filter @instigi/training-service db:migrate`; confirm schema `training` exists with no tables.
2. `pnpm --filter @instigi/training-service dev`; `curl localhost:4001/health`.
3. `POST /api/auth/login` on auth-service to get an access token; use it against a probe route wired with `requireAuth`; expect the `userId` echoed.
4. `docker compose build training-service` and `docker compose up -d training-service`; confirm migrate-on-boot and `/health`.

## Migration Notes

- The baseline Prisma migration is **hand-authored** (folder + `migration.sql` + `migration_lock.toml`) to run only `CREATE SCHEMA IF NOT EXISTS "training";` — Prisma generates no file for a schema with no models, and no existing migration exists in the repo to copy. There is no existing training data to migrate. Domain tables arrive in S-01+, which will add `@@schema("training")` models on top of this schema.
- Phase 1 moves files but preserves behaviour; the risk is import breakage, caught by auth-service’s existing tests and typecheck.

## References

- Change identity: `context/changes/workout-service-scaffold/change.md`
- Roadmap item F-01: `context/foundation/roadmap.md`
- Service template: `services/auth-service/` (`src/jwt.ts`, `src/middleware/auth.ts`, `src/db.ts`, `src/app.ts`, `Dockerfile`, `prisma/schema.prisma`)
- Shared-package template: `packages/types/` (`vite.config.ts`, `tsconfig.json`, `package.json`)
- Rules: `services/AGENTS.md`, root `AGENTS.md`
- Compose/Caddy: `docker-compose.yml`, `caddy/Caddyfile`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Extract shared auth/JWT utilities into `@instigi/utils`

#### Automated

- [ ] 1.1 Dependencies install: `pnpm install`
- [ ] 1.2 utils package builds: `pnpm --filter @instigi/utils build`
- [ ] 1.3 auth-service typecheck passes: `pnpm --filter @instigi/auth-service typecheck`
- [ ] 1.4 auth-service lint passes: `pnpm --filter @instigi/auth-service lint`
- [ ] 1.5 auth-service tests pass unchanged: `pnpm --filter @instigi/auth-service test`
- [ ] 1.6 auth-service builds: `pnpm --filter @instigi/auth-service build`
- [ ] 1.7 No lingering local jwt/middleware imports in auth-service src

#### Manual

- [ ] 1.8 auth-service dev still serves login/register/refresh unchanged

### Phase 2: Scaffold `training-service` shell

#### Automated

- [ ] 2.1 Install succeeds: `pnpm install`
- [ ] 2.2 Prisma client generates: `pnpm --filter @instigi/training-service db:generate`
- [ ] 2.3 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- [ ] 2.4 Lint passes: `pnpm --filter @instigi/training-service lint`
- [ ] 2.5 Build succeeds: `pnpm --filter @instigi/training-service build`

#### Manual

- [ ] 2.6 db:migrate creates empty `training` schema (verified in psql/pgAdmin)
- [ ] 2.7 dev boots on 4001; `/health` returns the correct body

### Phase 3: Wire JWT verification + tests

#### Automated

- [ ] 3.1 Tests pass: `pnpm --filter @instigi/training-service test`
- [ ] 3.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`

#### Manual

- [ ] 3.3 Real auth-service token verifies against a `requireAuth`-protected probe route

### Phase 4: Container & compose wiring

#### Automated

- [ ] 4.1 Whole workspace green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- [ ] 4.2 Image builds: `docker compose build training-service`
- [ ] 4.3 Caddyfile validates

#### Manual

- [ ] 4.4 `docker compose up` runs migrate-on-boot, creates `training` schema, `/health` ok
- [ ] 4.5 No regressions in auth-service / web-app / admin-app
