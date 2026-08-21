---
date: 2026-08-21T13:41:41+02:00
researcher: Copilot CLI
git_commit: 22a23a8265d027ab4423e8538bb23bb2f2d34c24
branch: master
repository: Http400/instigi
topic: "Phase 1 — training-service session integrity & metric domain rule (risks #1, #3, #5)"
tags: [research, codebase, training-service, sessions, validation, testing]
status: complete
last_updated: 2026-08-21
last_updated_by: Copilot CLI
---

# Research: Phase 1 — training-service session integrity & metric domain rule

**Date**: 2026-08-21T13:41:41+02:00
**Researcher**: Copilot CLI
**Git Commit**: 22a23a8265d027ab4423e8538bb23bb2f2d34c24
**Branch**: master
**Repository**: Http400/instigi

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md` ("Session integrity & domain rule")
against the live training-service. Locate, per risk, *where the failure lives* so the plan can
target integration tests precisely:

- **#1** — a set persists violating the per-exercise metric rule (undeclared metric, missing
  required metric, or disallowed entry type).
- **#3** — a completed workout is lost or partially saved on Finish.
- **#5** — an empty session is saved.

## Summary

All three risks are enforced **server-side** in a single controller,
[`services/training-service/src/controllers/sessions.ts`](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts),
behind `requireAuth`. The service is small (one controller for all session/exercise/entry
writes) and **already has a substantial integration test suite** at
[`src/__tests__/sessions.test.ts`](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts)
(613 lines) using the established pattern: supertest against the `app` export with
`vi.mock('../db.js')` and a signed JWT. Phase 1 is therefore a **gap-closing** effort, not a
greenfield one.

Key grounding findings:

- **The metric rule is a two-stage server check** — a Zod shape guard
  (`metricValuesSchema`) *then* a semantic check (`validateEntryValues`) against the
  **`metricsSnapshot`** stored on the session-exercise. `metricsSnapshot` (not the live
  `ExerciseDefinition`) is the source of truth, snapshotted at add-exercise time.
- **Entry-type validation has an asymmetry worth a test**: a client-supplied `entryType` is
  checked against `allowedEntryTypesSnapshot`, but the **defaulted** entry type
  (`defaultEntryTypeSnapshot`) is trusted unchecked.
- **Finish is a single-row `update` flipping `endedAt`** guarded by a two-count empty check
  (`exerciseCount < 1 || entryCount < 1`) → 422. There is **no multi-write transaction** in
  finish, so the "half-written workout" sub-risk in #3 is low *at finish*; the durability
  question is really "are the previously-written entries returned together with the finished
  session" (they are — the response `include`s exercises+entries).
- **The empty guard is server-side and OR-based**, so the "exercises present but zero sets"
  case is a distinct branch that current tests do not exercise.

## Detailed Findings

### Risk #1 — per-exercise metric domain rule

**Where it is enforced.** Two consecutive gates in `logSet`
([sessions.ts:437](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L437))
and re-used in `updateSet`
([sessions.ts:483](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L483)):

1. **Shape guard** — `logSetSchema` / `metricValuesSchema`
   ([sessions.ts:31-43](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L31-L43)).
   `values` is a Zod object of four optional non-negative numbers (`reps`, `load`, `distance`,
   `duration`). **Consequence:** unknown top-level keys outside these four are **stripped by
   Zod** (default object strip), not rejected — so "undeclared metric" is only caught at stage 2
   when the key *is* one of the four but is not declared for this exercise.
2. **Semantic guard** — `validateEntryValues(values, metrics)`
   ([sessions.ts:363-381](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L363-L381)):
   - rejects any value key **not present** in the exercise's `metrics` snapshot (undeclared
     metric) → `return false`;
   - rejects any **required** metric that is `undefined` or `<= 0`
     ([sessions.ts:375](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L375)).
     Note `required` defaults to truthy — only `required === false` is skipped
     ([sessions.ts:371](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L371)).

**Source of truth = the snapshot, not the definition.** `resolveWritableExercise`
([sessions.ts:392-435](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L392-L435))
selects `metricsSnapshot`, `defaultEntryTypeSnapshot`, `allowedEntryTypesSnapshot` from
`SessionExercise`. The snapshot is written at add-time in `addSessionExercise` from the
`ExerciseDefinition` ([sessions.ts around the `sessionExercise.create`](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts)),
matching the schema's soft-reference design
([schema.prisma:50-70](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/prisma/schema.prisma#L50-L70))
and the type contract comment in
[`packages/types/src/index.ts:80-97`](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/packages/types/src/index.ts#L80-L97).
Tests must therefore drive the rule through `sessionExercise.findFirst` returning a
`metricsSnapshot`, never through `ExerciseDefinition`.

**Entry-type rule.** In `logSet`
([sessions.ts:456-462](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L456-L462)):
`entryType = req.entryType ?? defaultEntryTypeSnapshot`, but the `allowed.includes(entryType)`
check runs **only when the client supplied `entryType`** (`if (result.data.entryType && ...)`).
`updateSet` does **not** touch `entryType` at all (values-only). The domain enum is fixed at
`['set','single','lap','interval']` ([sessions.ts:29](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L29)),
so a *typo* entry type is a Zod 400; a *valid-but-disallowed* entry type is a semantic 400.

**Existing coverage (risk #1).**
- ✅ missing required metric → 400
  ([sessions.test.ts "rejects a set missing a required metric"](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts#L352)).
- ✅ optional metric omitted → 201 (pull-up load)
  ([sessions.test.ts "accepts a set that omits an optional metric"](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts#L369)).
- ✅ valid set → 201 with next position.

**Gaps to close (risk #1).**
- ❌ **undeclared metric**: exercise declares only `reps`, client sends `{reps, load}` →
  expect 400 (exercises the `!allowed.has(key)` branch).
- ❌ **disallowed entry type**: `allowedEntryTypes: ['set']`, client sends `entryType:'lap'`
  with valid values → expect 400 (exercises the `allowed.includes` branch).
- ❌ **defaulted entry type is trusted**: valid values, no `entryType` → 201 uses
  `defaultEntryTypeSnapshot` (document as intended behavior, or flag if the snapshot could be
  stale/invalid).
- ❌ **required metric present but zero/negative** (`{reps: 0}`) → 400 (the `<= 0` branch;
  Zod alone allows 0 via `nonnegative`).
- ❌ **`updateSet` metric-rule parity**: same `validateEntryValues` call
  ([sessions.ts:494-501](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L494-L501))
  has no metric-rejection test today.

### Risk #3 — durable / atomic finish

**Where it is enforced.** `finishSession`
([sessions.ts:545-585](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L545-L585)):
1. ownership + existence via `workoutSession.findFirst({ where: { id, userId } })` → 404;
2. already-finished (`endedAt !== null`) → 409 `SESSION_ALREADY_FINISHED`;
3. empty check (see risk #5) → 422;
4. `workoutSession.update({ data: { endedAt: new Date() }, include: exercisesInclude })` →
   returns the session with **exercises + entries ordered by position**
   ([exercisesInclude, sessions.ts:130-138](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L130-L138)).

**Durability reality.** Entries are written incrementally at `logSet` time, each its own
`exerciseEntry.create`. Finish is a **single-row update** — atomic by itself, no multi-table
write, so Prisma has no transaction boundary to fail mid-way here. The "session persists but
entries don't" sub-scenario cannot arise *at finish* because finish writes no entries. The
provable protections are:
- after Finish, the returned session `data` contains **all** its exercises and their entries
  together (retrievable-together) — provable via the `include` and `toSessionDto`
  ([sessions.ts:110-120](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L110-L120));
- `GET /sessions/:id` returns the same populated shape
  ([getSession, sessions.ts](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts));
- Finish is **idempotency-guarded**: a second finish → 409, never a double-stamp.

**Existing coverage (risk #3).**
- ✅ finish with content stamps `endedAt`, no leaked `userId`
  ([sessions.test.ts "finishes a session with content"](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts#L454)).
  **Weakness:** the mocked `finishedSessionRow` has `exercises: []`
  ([sessions.test.ts:103-109](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts#L104-L110)),
  so it never proves entries come back *together*.
- ✅ already-finished → 409.

**Gaps to close (risk #3).**
- ❌ finish returns a session whose `exercises[].entries[]` are all present and
  position-ordered (mock `update` to resolve a populated row; assert nested entries).
- ❌ assert the update includes `exercisesInclude` (so the retrievable-together contract
  can't silently regress to a bare update).
- ⚠️ "mid-save failure leaves no half-written workout" — reframe for the plan: at the API
  boundary this is best proved as **"a rejected set write performs no `exerciseEntry.create`"**
  (already true for the validation paths) and **"a finish on an empty session performs no
  `workoutSession.update`"** (asserted). A DB-transaction-failure test is not meaningful with a
  mocked db; avoid over-promoting to e2e here.

### Risk #5 — empty-session guard

**Where it is enforced.** Server-side in `finishSession`
([sessions.ts:568-576](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L568-L576)):
```
const exerciseCount = await prisma.sessionExercise.count({ where: { sessionId: id } });
const entryCount    = await prisma.exerciseEntry.count({ where: { sessionExercise: { sessionId: id } } });
if (exerciseCount < 1 || entryCount < 1) → 422 SESSION_EMPTY  // update NOT called
```
This is the **only** persistence path that can move a session into history (history lists
`endedAt: { not: null }`, [listHistory](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts)),
so guarding finish fully guards "empty session pollutes history." Discard
(`DELETE /sessions/:id`) removes an in-progress session and cannot finish it.

**Existing coverage (risk #5).**
- ✅ both counts 0 → 422 `SESSION_EMPTY`, `update` not called
  ([sessions.test.ts "rejects finishing an empty session"](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/__tests__/sessions.test.ts#L472)).

**Gaps to close (risk #5).**
- ❌ **exercises present, zero sets** (`exerciseCount = 1`, `entryCount = 0`) → 422 — this is
  the distinct right-hand side of the `||` and the most likely real-world empty case (user adds
  an exercise, logs nothing, hits Finish). Currently untested.

## Code References

- `services/training-service/src/controllers/sessions.ts:29-43` — entry-type enum + `metricValuesSchema`/`logSetSchema` (Zod shape gate).
- `services/training-service/src/controllers/sessions.ts:363-381` — `validateEntryValues` (undeclared-key + required `<=0` rejection): the metric-rule oracle.
- `services/training-service/src/controllers/sessions.ts:392-435` — `resolveWritableExercise` (ownership + finished-guard + snapshot fetch).
- `services/training-service/src/controllers/sessions.ts:437-481` — `logSet` (two-stage validation + entry-type check + position append).
- `services/training-service/src/controllers/sessions.ts:483-521` — `updateSet` (re-runs `validateEntryValues`, values-only).
- `services/training-service/src/controllers/sessions.ts:545-585` — `finishSession` (empty guard + single-row `endedAt` update with `include`).
- `services/training-service/src/controllers/sessions.ts:130-138` — `exercisesInclude` (position-ordered exercises + entries).
- `services/training-service/prisma/schema.prisma:50-86` — `SessionExercise` (snapshots, cascade) + `ExerciseEntry`.
- `packages/types/src/index.ts:58-101` — `MetricKey`, `EntryType`, `ExerciseMetric`, `ExerciseEntryValues` (the domain contract).
- `packages/utils/src/middleware/auth.ts:11-27` — `requireAuth` (401 `UNAUTHORIZED` / `INVALID_TOKEN`).
- `services/training-service/src/__tests__/sessions.test.ts:1-118` — test harness: `vi.mock('../db.js')`, `signToken`, shared fixture rows (`benchExerciseSnapshot`, `pullUpExerciseSnapshot`, `finishedSessionRow`).
- `services/training-service/vitest.config.ts` — node env, globals, typecheck via `tsconfig.test.json`.

## Architecture Insights

- **Snapshot-as-source-of-truth.** Domain validation reads the session-exercise snapshot, never
  the live definition — a deliberate design so editing/archiving a definition can't rewrite
  history or retroactively invalidate logged sets. Tests must mock the snapshot, not the
  definition.
- **Two-stage validation is intentional and testable in isolation.** Zod guards *shape/type*
  (and silently strips unknown keys); `validateEntryValues` guards the *per-exercise domain
  rule*. The undeclared-metric case only reaches stage 2 for the four known keys — a subtlety
  the plan should encode rather than assume "any junk key is rejected."
- **Strict response envelope holds** across every path: `{ data }` on success,
  `{ message, code, statusCode }` on error (repo hard rule; `AGENTS.md`). Error codes are
  specific (`VALIDATION_ERROR`, `SESSION_EMPTY`, `SESSION_FINISHED`, `SESSION_ALREADY_FINISHED`,
  `NOT_FOUND`) — assert `code`, not just status.
- **Established test pattern to mirror** (services `AGENTS.md`): supertest against the `app`
  export, `vi.mock('../db.js')` at file top, `await import('../db.js')` for the mocked client,
  `mockResolvedValueOnce` sequencing that matches the controller's call order, and assertions
  on both the response and the Prisma call args (`.mock.calls[0][0]`).
- **Call-order coupling.** `logSet`/`updateSet`/`deleteSet` first `workoutSession.findFirst`
  (ownership+finished), then `sessionExercise.findFirst` (snapshot), then entry ops. Mocks must
  resolve in that exact order — the existing set tests are the reference.

## Historical Context (from prior changes)

- `context/changes/testing-session-integrity-domain-rule/change.md` — this rollout phase's
  identity; risk-response intent for #1/#3/#5 matches the code as found.
- `context/foundation/test-plan.md` §2–§3 — risk map and phased rollout; §6.1 cookbook entry
  for "service integration test (training-service)" is still `TBD` and is to be filled by this
  phase's `/10x-implement`.
- `context/foundation/data-model.md:220-374` — the authoritative description of `ExerciseMetric`
  (`required?`), `EntryType` semantics, `allowedEntryTypes`/`defaultEntryType`, and the
  snapshot-on-add design; confirms the server rule mirrors the intended domain model.
- No `context/archive/**` entries exist yet for this area (fresh service).

## Related Research

- None yet — this is the first `research.md` under `context/changes/`. Phases 2–4 of the
  rollout will add sibling research for access-control (#2), contract parity (#4), and the e2e
  loop (#6).

## Open Questions

1. **Defaulted entry type trust** — should a set that *omits* `entryType` still be validated
   against `allowedEntryTypesSnapshot` (in case a snapshot's `defaultEntryTypeSnapshot` is not
   in its own `allowedEntryTypesSnapshot`)? Currently trusted unchecked
   ([sessions.ts:456-462](https://github.com/Http400/instigi/blob/22a23a8265d027ab4423e8538bb23bb2f2d34c24/services/training-service/src/controllers/sessions.ts#L456-L462)).
   Decide whether Phase 1 asserts current behavior or flags a hardening test.
2. **`updateSet` entry-type immutability** — `updateSet` never revisits `entryType`; is an
   entry's type meant to be immutable after creation? If so, worth a documented assertion.
3. **Transaction framing for #3** — confirm the plan treats "no half-written workout" as
   "rejected writes call no `create`/`update`" (mock-verifiable) rather than a DB-failure
   simulation, to stay at the cheapest layer per §1 cost×signal.
