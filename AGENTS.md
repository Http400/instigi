# Repository Guidelines

Instigi is a workout-tracking monorepo (pnpm + Turborepo) with two React 19/MUI v9 SPAs, a shared component library, shared TypeScript types, and an Express 5/Prisma 7 auth service.

## Hard Rules

- **API response shape is strict.** Success: `{ data: T }`. Error: `{ message, code, statusCode }`. Never mix shapes. See `@packages/types` for `ApiResponse<T>` and `ApiError`.

See `@services/AGENTS.md` for auth-service–specific rules (ESM imports, Prisma, validation, role casing).

## Project Structure

- `apps/web-app` — React 19 SPA, port 3000
- `apps/admin-app` — React 19 SPA, port 3001
- `services/auth-service` — Express 5 REST API, port 4000
- `packages/ui` — shared MUI component library (Storybook at :6006)
- `packages/types` — shared TypeScript interfaces

Full setup and Docker instructions: `@README.md`.

## Build, Test & Dev Commands

Scripts live in `@package.json`. Run `pnpm lint && pnpm typecheck` before pushing.

## Coding Style & Conventions

Formatter config: `@.prettierrc`. Key non-defaults in `@tsconfig.base.json`:

- `noUncheckedIndexedAccess` — array access returns `T | undefined`; guard before use.
- `exactOptionalPropertyTypes` — optional properties cannot be assigned `undefined` explicitly.

`packages/ui` components thin-wrap MUI: forward all props with `...props` and add a `*.stories.tsx` file alongside every component.

## Testing

Vitest throughout. See `@services/AGENTS.md` for the auth-service supertest/mock pattern.

## Commit Guidelines

Conventional Commits style observed in history: `feat:`, `docs:`, `refactor:`, `chore:`. No CI workflows are configured yet.
