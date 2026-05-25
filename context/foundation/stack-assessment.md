---
project: instigi
assessed_at: 2026-05-19T13:59:38+02:00
agent_readiness: ready-with-compensation
context_type: brownfield
stack_components:
  language: TypeScript (strict)
  framework: React 19 + React Router v7 + MUI v9 (apps) / Express 5 + Prisma 7 + Zod (auth-service)
  build_tool: Vite 8 (apps) / tsc (auth-service) / Turborepo 2 (monorepo orchestration)
  test_runner: Vitest 4 (web-app, admin-app) / null (auth-service)
  package_manager: pnpm 10.33.3
  ci_provider: null
  deployment_target: Docker + docker-compose (multi-container, nginx-served frontend, PostgreSQL 17)
gates_passed: 4
gates_failed: 2
---

## Stack Components

**Language — TypeScript 6 (strict).** Used uniformly across all workspace packages, apps, and services. The root `tsconfig.base.json` enables `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` — one of the most conservative TypeScript configurations possible. All per-package `tsconfig.json` files extend this base.

**Frontend apps — React 19 + Vite 8 + React Router v7 + MUI v9 + Emotion.** Both `apps/web-app` and `apps/admin-app` are client-side SPAs using the same dependency set. React Router v7 is used in SPA mode (no file-based routing). MUI v9 (Material UI) provides the component system; Emotion powers its CSS-in-JS layer. Shared internal dependencies: `@instigi/types` and `@instigi/ui`.

**Backend service — Express 5 + Prisma 7 + Zod v4 + PostgreSQL 17.** The single backend service (`services/auth-service`) handles authentication. Express 5 (the new stable major) provides the HTTP layer. Prisma 7 (with the new prisma-client generator) manages the database schema and migrations. Zod v4 handles request validation at API boundaries. JWT (jsonwebtoken) and bcryptjs handle token issuance and password hashing.

**Shared packages — `@instigi/types`, `@instigi/ui`.** `packages/types` centralises shared TypeScript type definitions shared by frontend apps and the auth service. `packages/ui` is a shared component library with Storybook for development/documentation.

**Monorepo — Turborepo 2 + pnpm workspaces.** Task orchestration (build, dev, test, typecheck, lint) is managed by Turborepo. pnpm 10 is the package manager with a lockfile at the root.

**Testing — Vitest 4 with `@testing-library/react`.** Configured in both frontend apps (`vitest.config` embedded in `vite.config.ts`, jsdom environment, `src/test-setup.ts`). The auth-service has no test runner configured.

**Deployment — Docker + docker-compose.** Each app and service has its own Dockerfile. `docker-compose.yml` defines the full stack: PostgreSQL 17, auth-service (port 4000), web-app (port 3000 → nginx:80), admin-app (port 3001 → nginx:80). No CI/CD pipelines detected. No cloud deployment config files (fly.toml, vercel.json, etc.) found.

**Instruction files — none.** No `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, or `.cursor/rules` found.

---

## Quality Gate Assessment

| Component                | Typed | Convention | Training Data | Documented | Verdict  |
| ------------------------ | ----- | ---------- | ------------- | ---------- | -------- |
| TypeScript (strict)      | ✓     | —          | —             | —          | **pass** |
| React + Vite (apps)      | —     | ✗          | ✓             | ✓          | **fail** |
| Express 5 (auth-service) | —     | ✗          | ✓             | ✓          | **fail** |
| Prisma 7 (ORM)           | —     | ✓          | ✓             | ✓          | **pass** |
| Vitest 4 (test runner)   | —     | —          | ✓             | ✓          | **pass** |
| Turborepo 2 (monorepo)   | —     | ✓          | ✓             | ✓          | **pass** |

Legend: ✓ = pass, ✗ = fail, — = not applicable to this component

### Gate Details

#### Type Safety

**Pass.** TypeScript is used across all workspace members. Evidence: `tsconfig.base.json` at the root sets `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitReturns": true`, and `"noFallthroughCasesInSwitch": true`. Every app and service extends this base. The `build` script in all packages runs `tsc --noEmit` before emitting, enforcing type correctness at build time.

#### Convention-Based Structure

**React + Vite (apps) — Fail.** React and Vite individually carry no strong opinions about folder layout, route organisation, state management, or naming. React Router v7 in SPA mode does not enforce file-based routing. No documented project conventions exist (no CLAUDE.md, AGENTS.md, or conventions document found). An agent navigating `apps/web-app/src/` cannot predict where routes, components, hooks, or services live without reading every file. Evidence: `vite.config.ts` uses React plugin only, no file-based routing configuration; no conventions document detected.

**Express 5 (auth-service) — Fail.** Express is the canonical example of an unopinionated HTTP framework — routing, middleware order, validation, and error handling are assembled per project. The service is small (`src/routes/auth.ts` visible), and Zod is used for validation (a good pattern), but these are not enforced by the framework itself. Evidence: `services/auth-service/src/index.ts` shows manual `app.use()` composition with no framework-imposed structure.

**Prisma — Pass.** Prisma enforces strong conventions: schema lives in `prisma/schema.prisma`, generated client lands in a predictable output directory, migrations are tracked in `prisma/migrations/`. An agent knows exactly where to look for the database schema. Evidence: `services/auth-service/prisma/schema.prisma` exists with correct Prisma generator configuration.

**Turborepo — Pass.** Turborepo enforces a pipeline convention (`turbo.json`) and the pnpm workspace structure is well-defined (`pnpm-workspace.yaml`). An agent can predict where workspace packages live and how tasks compose.

#### Popularity in Training Data (within JS ecosystem)

**All components pass.** React, Vite, React Router, MUI, Express, Prisma, Zod, Vitest, and Turborepo are all mainstream choices within the JavaScript/TypeScript ecosystem. Each has extensive Stack Overflow coverage, GitHub presence, and is well-represented in LLM training corpora. PostgreSQL is also the most-documented open-source relational database. None of the choices are niche forks or brand-new frameworks. Evidence: all packages have millions of weekly npm downloads and years of community coverage.

#### Documentation Quality

**All components pass.** React (react.dev, versioned), Vite (vitejs.dev, versioned), React Router v7 (reactrouter.com with v7 docs), MUI v9 (mui.com/material-ui with version selector), Express 5 (expressjs.com updated for v5), Prisma (prisma.io/docs, version-aware), Zod v4 (zod.dev), Vitest (vitest.dev, versioned), Turborepo (turbo.build/repo, versioned). Note: Express 5 docs are updated but the v5 migration guide is newer — agents may occasionally conflate v4 patterns.

---

## Gaps & Compensation

### Gap 1: React + Vite apps have no structural conventions

**What failed:** Convention-based gate for `apps/web-app` and `apps/admin-app`.

**Why it matters for agent workflows:** Without explicit conventions, an agent adding a new feature (a new route, a new component, a new API call) must guess where to put files, how to name them, how to wire routing, and how to handle loading/error states. This produces inconsistent outputs that accumulate as technical debt. The gap compounds as the app grows.

**Compensation strategy:** Document folder structure, routing pattern, component naming, state management, and API integration conventions in `CLAUDE.md` or `AGENTS.md`. The entries below are ready to paste.

---

### Gap 2: Express service has no documented structure conventions

**What failed:** Convention-based gate for `services/auth-service`.

**Why it matters for agent workflows:** Express gives the agent no signal about where new routes live, how middleware stacks, how errors propagate, or how request validation integrates. A new developer (or agent) adding an endpoint will pattern-match off `src/routes/auth.ts` but may not know it is the canonical pattern to follow.

**Compensation strategy:** Document the middleware order, route file convention, request validation pattern, and error handling shape in `CLAUDE.md`. Entries below.

---

### Recommended Instruction File Additions

Create an `AGENTS.md` (or `CLAUDE.md`) at the repository root and paste the following blocks. Each block is a ready-to-use rule set.

---

````markdown
# Project: instigi — AI Agent Instructions

## Monorepo layout

```
apps/
  web-app/       # Customer-facing SPA (React + Vite)
  admin-app/     # Admin SPA (React + Vite, same stack as web-app)
packages/
  types/         # Shared TypeScript types — no runtime code
  ui/            # Shared React component library (Storybook for dev)
services/
  auth-service/  # JWT auth microservice (Express 5 + Prisma + PostgreSQL)
```

Always use the workspace package reference (`@instigi/types`, `@instigi/ui`) for shared code — never copy types or components across packages.

## TypeScript rules

All code must satisfy the root `tsconfig.base.json` settings: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns.

- Never use `any`. Prefer `unknown` and narrow at boundaries.
- Always annotate function parameter and return types explicitly at module boundaries.
- Use `satisfies` for config objects to preserve literal types.
- Run `pnpm typecheck` (which runs `turbo run typecheck`) before considering a change complete.

## Frontend apps (web-app / admin-app) — Folder conventions

```
src/
  components/        # Reusable UI components local to this app
  pages/             # One file per route — default export is the page component
  hooks/             # Custom React hooks (use-*.ts naming)
  services/          # API call functions (auth-api.ts, user-api.ts, etc.)
  types/             # App-local TypeScript types not shared via @instigi/types
  test-setup.ts      # Vitest global setup — do not modify
  main.tsx           # App entry point
  App.tsx            # Root component with router definition
```

- **Naming**: component files use PascalCase (`UserProfile.tsx`); hooks use camelCase with `use` prefix (`useAuthStatus.ts`); services use kebab-case (`auth-api.ts`).
- **Components**: prefer named exports; default export only for page components.
- **Route registration**: all routes are defined in `App.tsx` using React Router v7 `<Routes>`/`<Route>`. Add new routes there — do not scatter `<Routes>` blocks.
- **State management**: prefer React context + `useReducer` for cross-component state. Do not introduce a global state library without discussion.
- **API calls**: all fetch/axios calls live in `src/services/`. Pages and components import from `services/` — never call fetch directly in a component.
- **Error boundaries**: wrap route-level page components in an `<ErrorBoundary>`. Do not swallow errors silently.

## auth-service — Folder conventions

```
src/
  routes/        # One file per resource (auth.ts, users.ts, etc.) — exports a Router
  middleware/    # Express middleware functions (auth-middleware.ts, etc.)
  services/      # Business logic (auth-service.ts, token-service.ts, etc.)
  generated/     # Prisma client output — DO NOT EDIT
  index.ts       # Express app bootstrap — middleware registration order is load-bearing
```

- **Route registration order in `index.ts`**: global middleware first (cors, json), then health check, then resource routers.
- **Request validation**: use Zod at every API endpoint boundary before touching business logic. Define schemas adjacent to the route they validate (top of the route file).
- **Error handling**: throw typed errors from services; catch in a centralised Express error handler registered last in `index.ts`. Return `{ error: string, code: string }` JSON shapes — never expose stack traces.
- **Prisma**: the generated client is at `src/generated/prisma`. Import from there. Re-run `pnpm db:generate` after any schema change. Never write raw SQL unless Prisma cannot express the query.
- **Environment variables**: access via `process.env['VAR_NAME']` (not `process.env.VAR_NAME` — exactOptionalPropertyTypes requires bracket notation for index access). All required vars must be validated at startup.

## Testing

- **Frontend**: use Vitest + @testing-library/react. Test files co-locate with source (`Component.test.tsx` beside `Component.tsx`). Run with `pnpm test` at root.
- **Backend (auth-service)**: no test runner is configured yet. When adding tests, use Vitest with supertest for HTTP-level integration tests.
- **Do not test implementation details**: assert on user-visible behaviour and API contracts, not internal state.

## Running the stack

```bash
# All services (requires Docker)
docker compose up

# Development (individual packages)
pnpm dev                     # all apps via Turborepo
cd services/auth-service && pnpm dev   # auth-service only

# Database
cd services/auth-service && pnpm db:migrate   # apply migrations
cd services/auth-service && pnpm db:studio    # Prisma Studio UI
```

## CI/CD

No CI pipeline is configured. When adding one, run `pnpm typecheck && pnpm lint && pnpm test` as the minimum gate before merge.
````

---

## Summary

**Overall agent-readiness: ready-with-compensation.**

**Key strengths:**

- The TypeScript configuration is exceptionally strict — one of the strongest type-safety setups possible. An agent reading this codebase gets reliable type signals throughout.
- Every component in the stack (React, Express, Prisma, Zod, Vitest, Turborepo) is mainstream, well-documented, and well-represented in LLM training data. The agent will rarely confabulate idioms.
- Prisma's schema-driven ORM provides strong conventions for the data layer. Zod at API boundaries enforces a validation discipline the agent can follow.
- The monorepo structure with shared `types` and `ui` packages gives the agent clear cross-cutting seams to work with.

**Key gaps:**

- The frontend apps (React + Vite SPA) and the Express backend carry no framework-enforced structural conventions. Without the instruction file additions above, an agent will produce structurally inconsistent code over time.
- No CI/CD pipeline exists — there is no automated gate catching type errors or test failures before merge.
- The auth-service has no test suite — agent-generated code for that service cannot be verified by running tests.

**Recommended next step:** Run `/10x-health-check` to validate dependency health, identify outdated packages, and surface security advisories against this assessed stack.
