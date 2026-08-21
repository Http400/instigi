# Phase 1 — Session Integrity & Metric Domain Rule — Plan Brief

> Full plan: `context/changes/testing-session-integrity-domain-rule/plan.md`
> Research: `context/changes/testing-session-integrity-domain-rule/research.md`

## What & Why

Rollout Phase 1 of the project's test plan: prove the training-service enforces the per-exercise
metric rule (#1), a durable finish (#3), and the empty-session guard (#5). These are the top
"silently corrupt workout history" risks, and today's suite covers only their happy paths and a
couple of rejections. This change closes the gaps with additive integration tests — no production
code changes.

## Starting Point

All three risks are enforced in one controller,
`services/training-service/src/controllers/sessions.ts`, behind `requireAuth`. A 613-line suite
(`sessions.test.ts`) already exercises the house pattern (supertest against the `app` export,
`vi.mock('../db.js')`, signed JWT). Research located every gap precisely.

## Desired End State

`pnpm --filter @instigi/training-service test` passes with new cases that fail if any of the three
risks regress: the metric-rule rejection branches, the finish "entries retrievable together"
contract, and the exercises-present-but-zero-sets empty case all have asserting tests. The test
plan's `§6.1` cookbook holds the reusable recipe and its `§3` Phase 1 status reflects reality.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Metric-rule source of truth | Mock `metricsSnapshot` via `sessionExercise.findFirst` | The server validates the snapshot, not the live definition. | Research |
| Risk #3 atomicity framing | Mock-verifiable boundary assertions only | A DB-throw sim adds no signal with a mocked db. | Plan |
| Oracle avoidance | Expectations hand-derived from the domain rule | Test plan forbids copying assertions from the implementation. | Plan |
| Defaulted entry type | Assert current behavior + one flagged hardening test | Pins today's behavior while anchoring a future fix. | Plan |
| Test location | Extend `sessions.test.ts` in place | Reuse fixtures and the established describe blocks. | Plan |

## Scope

**In scope:** new integration cases for undeclared metric, disallowed entry type, required-zero,
`updateSet` parity, defaulted entry type (current + flagged), finish nested-entries + no-write
boundaries, empty-by-zero-sets; fill `§6.1`; stamp `§3` status.

**Out of scope:** any source change to `sessions.ts`; DB-failure/transaction simulation; new test
files; access-control (#2), contract-parity (#4), e2e (#6); config/CI changes.

## Architecture / Approach

Add `it` cases to existing `describe` blocks in `sessions.test.ts`, reusing the ordered
`mockResolvedValueOnce` sequencing (session ownership → snapshot → entry ops) and shared fixtures.
Each case asserts HTTP `status` + `code` and, at a boundary, that the mutating Prisma mock was not
called. Metric-rule expectations are reasoned from the data-model rule, never read off
`validateEntryValues`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Metric domain rule (#1) | undeclared / disallowed-type / required-zero / updateSet parity / defaulted-type cases | Oracle problem — mitigated by hand-derived expectations |
| 2. Durable finish & empty guard (#3, #5) | nested-entries finish, no-write boundaries, zero-sets empty case | Weak mock (empty `exercises`) hiding a real regression |
| 3. Cookbook & rollout status | `§6.1` recipe + `§3` status stamp | Doc drift vs actual Progress |

**Prerequisites:** none beyond a working `pnpm` install; research doc already in the change folder.
**Estimated effort:** ~1 session across 3 phases (2 test phases + 1 docs phase).

## Open Risks & Assumptions

- The defaulted entry-type trust gap is left in place and only flagged; if the team wants it
  fixed, that's a follow-up change (would touch `sessions.ts`).
- Mocked-db tests can't prove real transactional durability; #3 is covered at the API boundary
  only, by design.

## Success Criteria (Summary)

- New cases fail if the metric rule, finish-durability, or empty guard regress (verified by
  temporarily breaking each and watching a test bite).
- `pnpm --filter @instigi/training-service test`, `typecheck`, and `lint` all pass.
- `§6.1` is a usable recipe and `§3` Phase 1 status matches Progress.
