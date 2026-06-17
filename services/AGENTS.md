# Repository Guidelines

The `services/` directory holds backend REST services for Instigi, currently `auth-service` (Express 5 + Prisma 7, ESM, port 4000). See `@AGENTS.md` at the repo root for repo-wide rules.

## Hard Rules

- All intra-service imports require the `.js` extension (`import { prisma } from '../db.js'`).
- Success response shape: `{ data: T }`. Error response shape: `{ message, code, statusCode }`. Never mix.
- Validate every controller input with Zod `.safeParse()`. On failure return `{ message, code: 'VALIDATION_ERROR', statusCode: 400 }` — never expose raw Zod errors.
- `role` is stored uppercase (`USER`/`ADMIN`) in Postgres; call `.toLowerCase()` in the controller layer only.
- Import Prisma client from `'./generated/prisma/client.js'`, not `@prisma/client` directly.
- After any `prisma/schema.prisma` change, run `pnpm --filter @instigi/auth-service db:generate`.
- `DATABASE_URL` must include `?schema=auth`.

## Adding a New Route

1. Create `src/controllers/<feature>.ts` with one Zod schema per handler. Reference: `@services/auth-service/src/controllers/auth.ts`.
2. Create `src/routes/<feature>.ts` exporting a named `Router`. Reference: `@services/auth-service/src/routes/auth.ts`.
3. Mount the router in `src/app.ts` under `/api/<feature>`.
4. Add `src/__tests__/<feature>.test.ts` — call `vi.mock('../db.js', ...)` at the top of the file.

## Testing

Vitest + supertest against the `app` export (not a running server). Mock `../db.js` with `vi.mock` at the top of every test file, then `await import('../db.js')` to access the mocked client. Reference: `@services/auth-service/src/__tests__/auth.test.ts`.

Run: `pnpm --filter @instigi/auth-service test`

## Key Commands

`pnpm --filter @instigi/auth-service dev` — hot-reload dev server (Postgres must be running via `docker compose up -d postgres`).  
`pnpm --filter @instigi/auth-service build` — compile to `dist/`.  
`pnpm --filter @instigi/auth-service db:generate` — regenerate Prisma client after schema changes.  
`pnpm --filter @instigi/auth-service db:migrate` — run Prisma migrations.
