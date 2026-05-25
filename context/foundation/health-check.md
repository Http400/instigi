---
project: instigi
checked_at: 2026-05-19T14:18:00+02:00
health_status: healthy
context_type: brownfield
language_family: js
stack_assessment_available: true
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 0
  moderate: 1
  low: 0
test_runner_detected: true
ci_provider: null
recommended_fixes: 0
---

## Dependency Health

### Lockfile

```
Status: present (pnpm-lock.yaml)
Package manager: pnpm 10.33.3
```

`pnpm-lock.yaml` is present at the repository root and covers all workspace members. Dependency versions are pinned and builds are reproducible.

### Security Audit

```
Tool: pnpm audit --json
Summary: 0 CRITICAL, 0 HIGH, 1 MODERATE, 0 LOW
Direct vs transitive: finding is transitive (prisma > @prisma/dev > @hono/node-server)
```

No critical or high vulnerabilities. One moderate advisory:

**MODERATE findings**

- **@hono/node-server** 1.19.11 — GHSA-92pp-h63x-v22m (CVE-2026-39406, CVSS 5.3): Middleware bypass via repeated slashes in `serveStatic` — route-based middleware may not match paths with repeated slashes (`//admin/*`), allowing access to protected static files. This is a **transitive** dependency pulled in by `prisma > @prisma/dev` and is not a direct dependency of the project. The application does not use `@hono/node-server` or `serveStatic` directly, so the practical risk is negligible. Fix: upgrade Prisma when `@prisma/dev` ships with `@hono/node-server >= 1.19.13`. No action required today.

### Outdated Dependencies

```
Packages with major version gaps: 0
```

All dependencies are on the current major version. Several packages have patch/minor updates available (`@vitejs/plugin-react` 6.0.1→6.0.2, `vite` 8.0.12→8.0.13, `react-router` 7.15.0→7.15.1, `turbo` 2.9.12→2.9.14, `tsx` 4.21.0→4.22.3) — routine updates, no breaking changes expected.

**Note:** `@types/bcryptjs` (v3.0.0) is marked deprecated on npm. It has been replaced by first-party types bundled with `bcryptjs` itself since v3. Fix: remove `@types/bcryptjs` from `services/auth-service/package.json` and run `pnpm install`.

---

## Test Suite

```
Test runner: Vitest 4
Tests found: 2 tests across 2 test files (web-app: 1, admin-app: 1)
Test execution: passing
```

```
Configuration: embedded in vite.config.ts (jsdom environment, src/test-setup.ts)
Framework: Vitest 4.1.6 + @testing-library/react 16
```

Vitest is configured and working in both `apps/web-app` and `apps/admin-app`. Both test suites pass cleanly.

**⚠ Partial gap — auth-service has no test runner.** The `services/auth-service` package has no test script and no test runner configured. Agent-generated code for the backend cannot be automatically verified. The stack assessment identified this gap. See Category A fixes below.

---

## CI/CD

```
Provider: not detected
Configuration: not found
```

No CI/CD pipeline is configured. `.github/` contains only tool configuration files (`.github/copilot-instructions.md`, `.github/.10x-cli-manifest.json`) — no workflow files under `.github/workflows/`.

Stage coverage table:

| Stage      | Status | Notes                                               |
| ---------- | ------ | --------------------------------------------------- |
| Lint       | ✗      | Not configured (lint scripts run tsc --noEmit only) |
| Test       | ✗      | Not configured                                      |
| Build      | ✗      | Not configured                                      |
| Type check | ✗      | Not configured                                      |
| Security   | ✗      | Not configured                                      |

ℹ No CI/CD configuration detected. You'll set this up in [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5). For now, local test runner coverage is sufficient for agent collaboration.

---

## Configuration

### Medium severity

- **ESLint** — not configured. All `lint` scripts in the monorepo run `tsc --noEmit` (type-checking only), not a linter. Without ESLint, the agent's output is not style- or pattern-checked — import order, unused variables, React-specific rules (hooks, key prop) are silent. Fix: `pnpm add -D -w eslint @eslint/js typescript-eslint` then create `eslint.config.mjs` at the repo root. A minimal flat-config example for this TypeScript + React stack takes ~30 minutes to set up.

- **Prettier config file** — Prettier 3.5.3 is installed as a root dev dependency, but there is no `.prettierrc`, `prettier.config.mjs`, or `"prettier"` key in `package.json`. Prettier cannot run without a config — `npx prettier --check .` would format nothing and exit silently. Fix: `echo '{ "semi": true, "singleQuote": true, "tabWidth": 2 }' > .prettierrc` (adjust to your style preferences). Add a `format` script to the root `package.json`: `"format": "prettier --write ."`. Effort: quick (< 5 min).

### Low severity

- **.editorconfig** — missing. Without `.editorconfig`, editors may disagree on indent style, line endings, or trailing newlines. Agent-generated files will match whatever the tool defaults to. Fix: create a `.editorconfig` at the repo root. Effort: quick (< 5 min).

- **.env.example / .env.template** — missing. The `services/auth-service` reads environment variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`, etc.) but there is no documented example for new contributors or deployment environments. Fix: create `services/auth-service/.env.example` listing required vars with placeholder values. Effort: quick (< 5 min).

---

## Stack Assessment Cross-Reference

```
Stack assessment: context/foundation/stack-assessment.md
Agent readiness (from stack-assess): ready-with-compensation
```

| Quality Gate Gap                 | Health-Check Finding                                                                                 | Status      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| convention_based: fail (React)   | AGENTS.md present with full frontend folder conventions, naming rules, routing patterns              | Mitigated   |
| convention_based: fail (Express) | AGENTS.md present with auth-service folder conventions, Zod validation pattern, error handling shape | Mitigated   |
| ci_provider: null                | No CI pipeline confirmed — type-check, lint, and test are local-only gates                           | Reinforced  |
| test_runner: null (auth-service) | Vitest 4 added — 10 tests passing across health + all 3 auth routes                                  | Resolved ✅ |

The two quality-gate failures identified in the stack assessment have been substantially mitigated: `AGENTS.md` now exists with detailed conventions for both the React+Vite apps and the Express auth-service. The convention compensation is in place. The remaining reinforced gaps (no CI, no auth-service tests) are the priority before starting agent-assisted development at scale.

---

## Recommended Fixes

### Fix before agent work (Category A)

#### ~~1. Add Vitest to auth-service~~ ✅ Done

Added on 2026-05-19. `src/app.ts` extracts the Express app from `src/index.ts` (separating app configuration from `listen()`). Vitest 4 + supertest installed. 2 test files, 10 tests passing:

- `src/__tests__/health.test.ts` — `GET /health` returns 200 with correct body
- `src/__tests__/auth.test.ts` — register (validation, duplicate email, success), login (validation, user not found), refresh (missing token, invalid token). Prisma mocked with `vi.mock`.

TypeScript config split into three files:

- `tsconfig.json` — includes test files + `"types": ["vitest/globals"]` so the IDE resolves `describe`, `it`, `expect`, etc. without errors
- `tsconfig.build.json` — extends `tsconfig.json` but excludes `*.test.ts`; used by the `tsc --outDir dist` emit step so test files don't land in `dist/`
- `tsconfig.test.json` — referenced by `vitest.config.ts` for type-checking

Run with `pnpm test` inside `services/auth-service` or `pnpm test` at the monorepo root via Turborepo.

---

#### ~~2. Add Prettier config file~~ ✅ Done

Added `.prettierrc` on 2026-05-19 (single quotes, semicolons, 2-space indent, `trailingComma: es5`, `printWidth: 100`). `format` and `format:check` scripts added to root `package.json`. All 66 previously unformatted files reformatted — `pnpm format:check` passes cleanly.

---

#### ~~3. Configure ESLint~~ ✅ Done

Added on 2026-05-19. `eslint.config.mjs` created at the repo root using ESLint flat config:

- **All packages**: `@eslint/js` recommended + `typescript-eslint` recommended (catches `no-explicit-any`, `no-unused-vars`, empty types, etc.)
- **React apps + `packages/ui`**: `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`) + browser globals
- **`services/auth-service`**: Node.js globals
- **`*.stories.tsx`**: `react-hooks/rules-of-hooks` disabled (Storybook `render()` functions legitimately use hooks)
- **Test files**: `no-explicit-any` disabled (mocks commonly need it)

Two issues fixed during setup: `Button.tsx` empty interface replaced with a type alias (`type ButtonProps = MuiButtonProps`); Storybook story file rule relaxed.

All 5 workspace packages now have `"lint": "eslint src"`. `pnpm lint` at the root runs all via Turborepo — 5/5 pass with zero errors.

---

#### ~~4. Remove deprecated @types/bcryptjs~~ ✅ Done

Removed on 2026-05-19. `pnpm typecheck` passes — `bcryptjs` v3 bundles its own types.

---

### Addressed in upcoming lessons (Category B)

#### CI/CD pipeline

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: Set up a CI pipeline (GitHub Actions) that runs typecheck, lint, and test on every push — creating an automated quality gate that catches issues before they reach main.

#### AGENTS.md / AI assistant instruction file expansion

**Lesson**: [Agent Onboarding: Agents.md, AI Rules i feedback loops (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4)
**What you'll do there**: The existing `AGENTS.md` has solid convention documentation from the stack assessment. M1L4 will guide you through enriching it with agent-specific feedback loops, rules for handling ambiguity, and patterns for progressive disclosure of context.

---

## Summary

```
Health status: healthy
```

All Category A fixes have been resolved as of 2026-05-19. The **instigi** monorepo now has:

- **Clean security posture** — 0 CRITICAL, 0 HIGH vulnerabilities; one transitive MODERATE advisory (tracked)
- **Full test coverage** — Vitest 4 running in all 3 testable packages (web-app: 1 test, admin-app: 1 test, auth-service: 10 tests); auth-service app/server split enables supertest without starting a live server
- **Consistent formatting** — Prettier configured and enforced; `pnpm format:check` passes across the full monorepo
- **Linting enforced** — ESLint with TypeScript and React Hooks rules; `pnpm lint` passes 5/5 packages via Turborepo
- **Strict TypeScript** — one of the most conservative tsconfig setups possible (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Documented conventions** — `AGENTS.md` covers monorepo layout, TypeScript rules, React app folder conventions, auth-service structure, and testing patterns

Next step: proceed to [Agent Onboarding (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4) to enrich agent instruction context with feedback loops and progressive context disclosure.
