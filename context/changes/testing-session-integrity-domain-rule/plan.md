# Phase 1 — Session Integrity & Metric Domain Rule (training-service) Implementation Plan

## Overview

Close the integration-test gaps for rollout Phase 1 of `context/foundation/test-plan.md`
("Session integrity & domain rule"), covering risks **#1** (per-exercise metric rule), **#3**
(durable finish), and **#5** (empty-session guard). The work is **additive test authoring** in
the training-service — no production code changes — extending the existing supertest +
`vi.mock('../db.js')` suite. It ends by filling the `§6.1` cookbook recipe and stamping the
`§3` rollout status.

## Current State Analysis

The three risks are all enforced server-side in one controller,
`services/training-service/src/controllers/sessions.ts`, behind `requireAuth`. A 613-line
integration suite already exists at `services/training-service/src/__tests__/sessions.test.ts`
using the house pattern (supertest against the `app` export, `vi.mock('../db.js')` at file top,
signed JWT via `signToken`, ordered `mockResolvedValueOnce` sequencing).

Existing coverage and gaps are fully enumerated in
`context/changes/testing-session-integrity-domain-rule/research.md`. Summary of what is missing:

- **#1** covered: missing-required → 400, optional-omitted → 201. **Gaps:** undeclared metric,
  disallowed entry type, required-but-zero, `updateSet` metric-rule parity, defaulted entry-type
  behavior.
- **#3** covered: finish stamps `endedAt`, already-finished → 409. **Gap:** the finish test's
  mock returns `exercises: []`, so "entries retrievable together" is never actually proven; no
  assertion that rejected writes / empty-finish call no `create`/`update`.
- **#5** covered: both-counts-zero → 422. **Gap:** exercises-present-but-zero-sets (the distinct
  right side of the `||`) untested.

## Desired End State

`pnpm --filter @instigi/training-service test` passes with new cases that fail if any of the
three risks regress. Verify by: the metric-rule, finish-durability, and empty-guard branches in
`sessions.ts` each have at least one asserting test; `§6.1` of `test-plan.md` contains the
training-service integration recipe; the `§3` Phase 1 row reflects implementation status.

### Key Discoveries:

- Metric rule is two-stage: Zod shape guard then `validateEntryValues` against the
  **`metricsSnapshot`** — `sessions.ts:363-381`. Tests must mock the snapshot via
  `sessionExercise.findFirst`, never `ExerciseDefinition`.
- Entry-type check runs only when the client supplies `entryType`
  (`if (result.data.entryType && !allowed.includes(...))`) — `sessions.ts:456-462`. The
  defaulted path is trusted unchecked.
- Finish is a single-row `update` with `exercisesInclude` (position-ordered exercises + entries)
  — `sessions.ts:545-585`, `sessions.ts:130-138`. No multi-write transaction exists.
- Empty guard is `exerciseCount < 1 || entryCount < 1` → 422 `SESSION_EMPTY` — `sessions.ts:568-576`.
- House test pattern and shared fixtures (`benchExerciseSnapshot`, `pullUpExerciseSnapshot`,
  `finishedSessionRow`) — `sessions.test.ts:1-118`.

## What We're NOT Doing

- **No production/source changes** to `sessions.ts` or any controller. If the defaulted
  entry-type trust gap warrants a fix, it is flagged as a follow-up, not implemented here.
- **No DB-failure / transaction simulation** (mock `create`/`update` throwing) — risk #3 stays
  at mock-verifiable boundary assertions per the planning decision.
- **No new test files** — all cases extend `sessions.test.ts` in place.
- **No access-control (#2), contract-parity (#4), or e2e (#6) work** — those are Phases 2–4.
- **No changes to Vitest config, CI, or the `app`/db harness.**

## Implementation Approach

Add cases to the existing `describe` blocks (or add sibling `describe`s where a route has none),
reusing the established mock-sequencing pattern and shared fixture rows. Expected results for the
metric-rule cases are **hand-derived from the domain rule** (data-model: a value key must be a
declared metric; every non-`required:false` metric must be present and > 0; a supplied
`entryType` must be in `allowedEntryTypes`) — never copied from `validateEntryValues`, to avoid
the oracle problem the test-plan warns against. Each new case asserts both the HTTP
`status`/`code` and, where it proves a boundary, that the relevant Prisma write mock was *not*
called. Finish the change by filling the `§6.1` cookbook entry and stamping the `§3` status.

## Phase 1: Metric domain rule (#1)

### Overview

Add the missing metric-rule and entry-type assertions to the
`POST .../sets` and `PATCH .../sets/:entryId` describe blocks, with expectations derived
independently from the domain rule.

### Changes Required:

#### 1. logSet metric-rule cases

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Prove the server rejects sets that violate the per-exercise metric rule and accepts a
valid one, exercising the branches current tests miss. Reuse `benchExerciseSnapshot`
(reps+load required, `allowedEntryTypes: ['set']`) and add a snapshot fixture whose exercise
declares only `reps` for the undeclared-metric case.

**Contract**: New `it` cases under `describe('POST /sessions/:id/exercises/:sessionExerciseId/sets')`,
each mocking `workoutSession.findFirst` (active) then `sessionExercise.findFirst` (snapshot) in
order:
- undeclared metric — exercise declares only `reps`, body `{ values: { reps: 8, load: 70 } }` →
  400 `VALIDATION_ERROR`, `exerciseEntry.create` not called.
- disallowed entry type — `allowedEntryTypes: ['set']`, body `{ entryType: 'lap', values: {…valid} }`
  → 400 `VALIDATION_ERROR`, `create` not called.
- required metric present but zero — body `{ values: { reps: 0, load: 70 } }` → 400
  `VALIDATION_ERROR`, `create` not called.
- defaulted entry type accepted (current behavior) — valid values, `entryType` omitted → 201,
  and assert the `exerciseEntry.create` call arg `entryType` equals the snapshot's
  `defaultEntryTypeSnapshot`.

#### 2. Defaulted-entry-type hardening test (flagged)

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Document the trust gap surfaced in research — the defaulted `entryType` is not
re-validated against `allowedEntryTypes`. Add one test that pins the *current* behavior and
carries an inline comment flagging it as a known gap / potential hardening follow-up, so a future
fix has a failing/adjustable anchor.

**Contract**: An `it` (title referencing the trust gap) with a snapshot whose
`defaultEntryTypeSnapshot` is NOT in its own `allowedEntryTypesSnapshot`; body omits `entryType`;
assert current behavior (201, entry created with the default type). Inline `// KNOWN GAP:` comment
naming research Open Question #1.

#### 3. updateSet metric-rule parity case

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Prove `updateSet` re-runs the same metric rule so an edit can't smuggle in an invalid
value.

**Contract**: New `it` under `describe('PATCH /sessions/:id/exercises/:sessionExerciseId/sets/:entryId')`
mocking `workoutSession.findFirst` (active) then `sessionExercise.findFirst` (snapshot); body
`{ values: { reps: 8 } }` against a reps+load-required snapshot → 400 `VALIDATION_ERROR`,
`exerciseEntry.update` not called.

### Success Criteria:

#### Automated Verification:

- Test suite passes: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual Verification:

- New case titles map 1:1 to the research "Gaps to close (risk #1)" list; each expected
  status/code was reasoned from the domain rule, not read off `validateEntryValues`.

**Implementation Note**: After automated verification passes, pause for human confirmation before
Phase 2.

---

## Phase 2: Durable finish & empty-session guard (#3, #5)

### Overview

Strengthen the finish tests to prove entries come back together, add the boundary "no write on
rejection" assertions, and add the exercises-present-but-zero-sets empty case.

### Changes Required:

#### 1. Finish returns session with all entries, position-ordered

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Close the weakness where `finishedSessionRow` has `exercises: []` — prove the finish
response carries the session's exercises and their entries together (retrievable-together
contract) and that the update requested them.

**Contract**: In `describe('POST /sessions/:id/finish')`, add (or upgrade) an `it` that mocks
`workoutSession.update` to resolve a populated row (≥1 exercise, each with ≥2 entries at
positions 1..n). Assert `res.body.data.exercises[0].entries` length and that entry `position`
values are ascending; assert the `workoutSession.update` mock call included `exercisesInclude`
(i.e. `include.exercises` present). No leaked `userId`.

#### 2. Boundary "no write on rejection" assertions

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Frame risk #3's "no half-written workout" as mock-verifiable boundary checks rather
than a DB-failure simulation.

**Contract**: Extend the empty-finish and finished-session cases (and the Phase 1 rejection cases)
to assert the mutating mock was not called — `workoutSession.update` not called on 422/409 finish;
`exerciseEntry.create`/`update` not called on rejected set writes (some already assert this — add
where missing). No new source behavior.

#### 3. Empty guard — exercises present, zero sets

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Cover the distinct right-hand side of the `exerciseCount < 1 || entryCount < 1` guard
— the realistic "added an exercise, logged nothing, hit Finish" case.

**Contract**: New `it` under `describe('POST /sessions/:id/finish')` mocking
`workoutSession.findFirst` (active), `sessionExercise.count` → 1, `exerciseEntry.count` → 0 →
422 `SESSION_EMPTY`, `workoutSession.update` not called.

### Success Criteria:

#### Automated Verification:

- Test suite passes: `pnpm --filter @instigi/training-service test`
- Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual Verification:

- The finish test genuinely asserts nested entries (not an empty `exercises` array); removing the
  controller's `include` would fail it.

**Implementation Note**: After automated verification passes, pause for human confirmation before
Phase 3.

---

## Phase 3: Cookbook & rollout status

### Overview

Record the training-service integration recipe and reflect Phase 1 status in the test plan.

### Changes Required:

#### 1. Fill test-plan §6.1 cookbook entry

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the `§6.1` TBD with the concrete recipe this phase established so future
contributors can add a training-service integration test without rediscovery.

**Contract**: Rewrite the `### 6.1` bullet(s) to name: location (`services/training-service/src/__tests__/sessions.test.ts`),
the `vi.mock('../db.js')` + `await import` + `signToken` pattern, the mock-sequencing order
(session ownership → snapshot → entry ops), the snapshot-as-source-of-truth rule, the
oracle-avoidance rule for domain assertions, and the run command
`pnpm --filter @instigi/training-service test`. Reference `sessions.test.ts` as the canonical
example.

#### 2. Stamp §3 rollout status

**File**: `context/foundation/test-plan.md`

**Intent**: Move the `§3` Phase 1 row Status from `change opened` toward its implemented state per
the status vocabulary.

**Contract**: Update the Phase 1 row Status cell (to `implementing` while landing, `complete` when
Progress is fully `[x]`) and refresh the "Last updated" note line at the top of the file.

### Success Criteria:

#### Automated Verification:

- Both edited sections exist: `grep -q "pnpm --filter @instigi/training-service test" context/foundation/test-plan.md`
- No TBD remains in §6.1: `grep -A2 "### 6.1" context/foundation/test-plan.md` shows the recipe, not `TBD`.

#### Manual Verification:

- `§6.1` reads as a usable recipe to someone who wasn't in this session.
- `§3` Phase 1 Status matches the actual Progress state.

**Implementation Note**: Documentation-only phase; no app tests to run.

---

## Testing Strategy

### Unit / Integration Tests:

- All new cases are integration tests through the Express `app` with the db mocked — the only
  layer this rollout phase uses.
- Key edge cases: undeclared metric key, disallowed (valid-but-not-allowed) entry type, required
  metric = 0, `updateSet` parity, defaulted entry type (current + flagged), finish returns nested
  ordered entries, empty-by-zero-sets.

### Manual Testing Steps:

1. Run `pnpm --filter @instigi/training-service test` and confirm the new cases appear and pass.
2. Temporarily comment out `validateEntryValues`' undeclared-key loop and confirm the
   undeclared-metric test fails (sanity that the test bites).
3. Temporarily remove `exercisesInclude` from `finishSession` and confirm the nested-entries
   finish test fails.

## References

- Research: `context/changes/testing-session-integrity-domain-rule/research.md`
- Rollout strategy: `context/foundation/test-plan.md` (§2 risks, §3 Phase 1, §6.1 cookbook)
- Domain rule: `context/foundation/data-model.md:220-374`
- Controller under test: `services/training-service/src/controllers/sessions.ts:363-585`
- Test harness / fixtures: `services/training-service/src/__tests__/sessions.test.ts:1-118`
- Service test rules: `services/AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Metric domain rule (#1)

#### Automated

- [x] 1.1 Test suite passes: `pnpm --filter @instigi/training-service test`
- [x] 1.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- [x] 1.3 Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual

- [x] 1.4 New case titles map 1:1 to research "Gaps to close (risk #1)"; expectations hand-derived from the domain rule, not from `validateEntryValues`

### Phase 2: Durable finish & empty-session guard (#3, #5)

#### Automated

- [ ] 2.1 Test suite passes: `pnpm --filter @instigi/training-service test`
- [ ] 2.2 Typecheck passes: `pnpm --filter @instigi/training-service typecheck`
- [ ] 2.3 Lint passes: `pnpm --filter @instigi/training-service lint`

#### Manual

- [ ] 2.4 Finish test asserts nested position-ordered entries; removing the controller `include` would fail it

### Phase 3: Cookbook & rollout status

#### Automated

- [ ] 3.1 §6.1 recipe present: `grep -q "pnpm --filter @instigi/training-service test" context/foundation/test-plan.md`
- [ ] 3.2 No TBD remains in §6.1

#### Manual

- [ ] 3.3 §6.1 reads as a usable recipe; §3 Phase 1 Status matches actual Progress
