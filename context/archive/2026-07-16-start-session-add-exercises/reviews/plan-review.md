<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Start a Session & Add Exercises (S-02)

- **Plan**: context/changes/start-session-add-exercises/plan.md
- **Mode**: Deep
- **Date**: 2026-07-23
- **Verdict**: SOUND
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
11/11 paths ✓, symbols ✓ (baseQuery factory, exercisesApi transformResponse, ExercisesToolbar controlled props, ownership filter, NavItem.to already wired), brief↔plan ✓, Progress↔Phase ✓.

## Findings

### F1 — Non-deterministic exercise order on rapid/duplicate add

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 (reads + addSessionExercise), Phase 5 (AddExerciseDialog)
- **Detail**: `position = max+1` is read-then-write with no unique constraint on (session_id, position). Duplicates are allowed and the Add dialog stays open, so two quick Adds can share a position; reads ordered by `position asc` only → non-deterministic order for tied rows.
- **Fix**: Order reads by [position asc, createdAt asc] and disable a row's Add action while its mutation is pending in AddExerciseDialog. No schema change.
  - Strength: Deterministic regardless of position collisions; matches "duplicates allowed".
  - Tradeoff: Doesn't prevent the collision itself (acceptable — position is display-order).
  - Confidence: HIGH — grounded in the DDL (no unique) and the dialog spec.
  - Blind spot: None significant.
- **Decision**: Fixed in plan

### F2 — Phase 2 index diverges from data-model DDL

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 — SessionExercise model
- **Detail**: Plan specified `@@index([sessionId])`, but the authoritative DDL (data-model.md:1010) is a composite `(session_id, position)`.
- **Fix**: Change to `@@index([sessionId, position])` to match the DDL and back the ordered read.
- **Decision**: Fixed in plan

### F3 — Active-session route won't highlight Workouts nav

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 5 (AppLayout nav) — AppLayout.tsx:84,110
- **Detail**: Nav `selected`/`activeBottomNav` use exact `location.pathname === item.to`, so `/workouts/:sessionId` won't highlight Workouts. Cosmetic.
- **Fix**: Prefix-match `/workouts` for the active check.
- **Decision**: Fixed in plan
