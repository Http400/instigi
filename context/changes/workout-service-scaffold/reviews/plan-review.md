<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Training Service Scaffold (F-01)

- **Plan**: context/changes/workout-service-scaffold/plan.md
- **Mode**: Deep
- **Date**: 2026-07-03
- **Verdict**: REVISE (all findings fixed → SOUND)
- **Findings**: 1 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding
13/13 paths ✓, symbols ✓ (verifyAccessToken/requireAuth used only inside jwt.ts + middleware/auth.ts — no route consumers, Phase 1 safe), brief present ✓. `## Progress` block well-formed.

## Findings

### F1 — Empty-schema baseline migration is self-contradictory & under-specified

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details + Phase 2 §2 (Prisma)
- **Detail**: Plan said `migrate dev --create-only` writes no file for a zero-model schema, then told the implementer to "hand-edit the generated SQL" — nothing is generated. No migrations exist in the repo as a template, and `migration_lock.toml` (required by `migrate deploy`) was never mentioned. Phase 2/4 migrate steps would fail as written.
- **Fix**: Rewrote the step to hand-CREATE the full folder: `migrations/<timestamp>_init/migration.sql` (`CREATE SCHEMA IF NOT EXISTS "training";`) plus `migrations/migration_lock.toml` (`provider = "postgresql"`), applied via `migrate deploy`. Updated Critical Implementation Details, Phase 2 contract, and Migration Notes.
- **Decision**: FIXED (Fix in plan)

### F2 — Shared JWT_SECRET may be captured before the Phase 3 test sets it

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 §2 (packages/utils/src/jwt.ts) + Phase 3 §2 (test)
- **Detail**: The auth-service template reads JWT_SECRET at module load. Phase 3's test sets `process.env.JWT_SECRET` then signs, but ESM evaluates the package (capturing the secret) before the test body runs → valid token verifies against the stale fallback → 401 instead of 200, failing test 3.1.
- **Fix**: Specified that packages/utils `verifyAccessToken` reads JWT_SECRET from `process.env` at call time (inside the function), not at module load.
- **Decision**: FIXED (Fix in plan)

### F3 — Phase 3 probe handler `req.user.userId` won't typecheck

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 §2 (auth-middleware.test.ts contract)
- **Detail**: `AuthRequest.user` is optional; under strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes, `req.user.userId` is a possibly-undefined error that won't narrow through requireAuth, failing typecheck 3.2.
- **Fix**: Changed the probe handler contract to `req.user?.userId`.
- **Decision**: FIXED (Fix in plan)

### F4 — Vite `external` rationale for express is inaccurate (harmless)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Critical Implementation Details
- **Detail**: middleware imports express as `import type {...}` (erased at build); only jsonwebtoken is a runtime import, so "would bundle a second copy of Express" doesn't apply.
- **Fix**: Trimmed the rationale to note express is type-only and jsonwebtoken is the load-bearing external; kept express in the list as defensive.
- **Decision**: FIXED (Fix in plan)
