# Monorepo Setup Plan

## Problem
Set up a pnpm + Turborepo monorepo in the `instigi` repo with:
- **apps/web-app** — Vite + Vitest + React + TypeScript
- **apps/admin-app** — Vite + Vitest + React + TypeScript
- **services/auth-service** — Node.js + Express + TypeScript + Prisma (PostgreSQL)
- **packages/ui** — shared MUI-based React component library (Vite library mode)
- **packages/types** — shared TypeScript types (Vite library mode)
- **Docker Compose** for local development (app services + PostgreSQL)

## Proposed Structure

```
instigi/
├── apps/
│   ├── web-app/
│   └── admin-app/
├── services/
│   └── auth-service/
├── packages/
│   ├── ui/
│   └── types/
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json               # root — workspaces, scripts, devDependencies (TS, ESLint, Prettier)
└── tsconfig.base.json         # shared TS config extended by all packages/apps
```

## Approach

- **Package manager**: pnpm with workspace protocol (`workspace:*`)
- **Task runner**: Turborepo — pipelines for `build`, `dev`, `test`, `lint`
- **Shared types** (`packages/types`): pure TypeScript, built with Vite library mode, emits `.d.ts`
- **Shared UI** (`packages/ui`): React + MUI, Vite library mode, Vitest for component tests
- **Apps** scaffold from Vite templates, then wired to shared packages
- **Auth service**: Express + TypeScript compiled via `tsc`, Prisma with PostgreSQL. Lives under `services/` (add `services/*` to pnpm-workspace.yaml)
- **Docker Compose**: PostgreSQL service + placeholder service definitions for each app

## Todos

1. `monorepo-root` — Scaffold root: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .npmrc, root .gitignore additions
2. `pkg-types` — Create packages/types: Vite lib mode build, exports shared TS types
3. `pkg-ui` — Create packages/ui: React + MUI components, Vite lib mode, Vitest
4. `app-web` — Create apps/web-app: Vite+React+TS+Vitest, wired to @instigi/ui and @instigi/types
5. `app-admin` — Create apps/admin-app: Vite+React+TS+Vitest, wired to @instigi/ui and @instigi/types
6. `app-auth` — Create services/auth-service: Express+TS+Prisma (PostgreSQL), wired to @instigi/types
7. `docker` — Docker Compose: PostgreSQL + per-service Dockerfiles + compose service entries
8. `turbo-pipelines` — Finalize turbo.json pipelines (build order, caching, env vars)
9. `verify` — Install all deps, run `pnpm turbo build` and `pnpm turbo test` to verify the setup

## Notes

- All packages use `"@instigi/"` scope (e.g. `@instigi/ui`, `@instigi/types`, `@instigi/auth-service`)
- `tsconfig.base.json` at root defines strict TS settings; each package/app extends it
- Turborepo caches builds; `packages/ui` and `packages/types` must build before apps
- Prisma migrations live in `services/auth-service/prisma/`
- Docker Compose uses a named volume for Postgres data persistence
