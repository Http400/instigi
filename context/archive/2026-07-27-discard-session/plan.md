# Discard an In-Progress Workout Session Implementation Plan

## Overview

Give the user a way to abandon an in-progress workout session and permanently
remove it. This is roadmap slice S-05 (PRD FR-007). A guarded backend endpoint
deletes the session (children cascade away), an RTK Query mutation invalidates
the active-session cache, and a low-emphasis "Discard workout" button with a
destructive confirmation dialog lives on the session page.

## Current State Analysis

- The training-service exposes create / read / update / finish for sessions
  (`services/training-service/src/controllers/sessions.ts`,
  `services/training-service/src/routes/sessions.ts`). There is **no** delete
  path — an in-progress session can only be finished (which requires ≥1 set) or
  left open indefinitely.
- `finishSession` (`controllers/sessions.ts:519`) is the closest pattern: it
  resolves an owned session, rejects a finished one with a 409, then mutates.
- Prisma relations `SessionExercise → WorkoutSession` and
  `ExerciseEntry → SessionExercise` both declare `onDelete: Cascade`
  (`services/training-service/prisma/schema.prisma:64,81`), so deleting a
  `WorkoutSession` removes all its exercises and entries automatically.
- The web-app data layer (`apps/web-app/src/features/sessions/sessionsApi.ts`)
  is an RTK Query slice with `tagTypes: ['ActiveSession', 'Session', 'History']`.
  Mutations invalidate the relevant tags to refresh cached queries.
- `SessionPage.tsx` (`apps/web-app/src/pages/workouts/SessionPage.tsx`) already
  hosts the "Finish workout" button and a confirmation `Dialog` (lines 237-269),
  plus a `finishError` alert and navigation to `/workouts` on success — the
  exact shape discard needs.

## Desired End State

From an in-progress session page, the user can click "Discard workout", confirm
in a dialog warning the action is permanent, and have the session (and all its
exercises and sets) deleted server-side, landing back on `/workouts` with no
active session. Attempting to discard an already-finished session is rejected
with a 409. Verify via the automated suites plus a manual walkthrough.

### Key Discoveries:

- Cascade delete on both child relations (`schema.prisma:64,81`) means a single
  `prisma.workoutSession.delete` performs all state cleanup — no transaction.
- `finishSession` guard logic (`controllers/sessions.ts:519-538`) is the exact
  owner-check + finished-check pattern to reuse for discard.
- `DELETE /:id` slots cleanly into `routes/sessions.ts` — the existing `/:id`
  handlers are GET and PATCH, so the verb does not collide.
- RTK mutations invalidate tags via `invalidatesTags`
  (`sessionsApi.ts:91,101,179`); discard invalidates `ActiveSession` and the
  `Session` id, but **not** `History` (a discarded session never enters history).
- Training-service tests mock `prisma` per-model and drive routes with supertest
  + a signed JWT (`services/training-service/src/__tests__/sessions.test.ts`).
  New test blocks must be appended via heredoc because `Authorization` header
  values are masked by the editing tools.

## What We're NOT Doing

- Not adding a discard entry point on the WorkoutsPage active-session card — the
  action lives only inside SessionPage.
- Not supporting deletion of finished/saved workouts — discard is in-progress
  only (protects the S-04 history loop).
- Not adding soft-delete / archival state — discard is a hard delete.
- Not adding undo / restore.
- Not gating discard on session contents — an empty in-progress session can be
  discarded.

## Implementation Approach

Follow the finish flow end to end, one layer per phase: backend endpoint first
(with tests), then the RTK mutation, then the UI button + confirm dialog. Each
layer mirrors an existing, tested counterpart, so risk is low and review is
mechanical.

## Phase 1: Backend — discard endpoint

### Overview

Add a `discardSession` controller and a `DELETE /api/sessions/:id` route that
permanently removes an owned, in-progress session.

### Changes Required:

#### 1. Discard controller

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Add a `discardSession` handler that resolves the owned session,
rejects it with a 409 when already finished, then deletes it (children cascade).

**Contract**: `export async function discardSession(req: AuthRequest, res: Response): Promise<void>`.
Resolve `id` from `req.params['id']` and `userId` from `req.user!.userId`. Look
up the session with `findFirst({ where: { id, userId }, select: { id: true, endedAt: true } })`.
404 `NOT_FOUND` when missing; 409 `SESSION_ALREADY_FINISHED` when `endedAt !== null`
(same code/shape as `finishSession`). Otherwise `await prisma.workoutSession.delete({ where: { id } })`
and respond `res.json({ data: { id } })` (mirrors `removeSessionExercise`'s
`{ data: { id } }` success shape).

#### 2. Route registration

**File**: `services/training-service/src/routes/sessions.ts`

**Intent**: Wire the new handler to a DELETE verb on the existing `/:id` path.

**Contract**: Import `discardSession`; add
`sessionsRouter.delete('/:id', requireAuth, discardSession);` alongside the other
`/:id` handlers (after the `patch('/:id', ...)` line).

#### 3. Tests

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Cover discard success, the finished-session 409, the missing 404,
and ownership isolation.

**Contract**: Add `delete: vi.fn()` to the `workoutSession` mock (and its
reset). Append (via heredoc) a `describe('DELETE /api/sessions/:id')` block:
(a) in-progress owned session → 200 with `{ data: { id } }`, `workoutSession.delete`
called with `{ where: { id } }`; (b) finished session (`endedAt` set) → 409
`SESSION_ALREADY_FINISHED`, `delete` not called; (c) unknown / non-owned id
(`findFirst` returns null) → 404 `NOT_FOUND`, `delete` not called.

### Success Criteria:

#### Automated Verification:

- Types build: `pnpm --filter @instigi/types build`
- Training-service typecheck: `pnpm --filter @instigi/training-service typecheck`
- Training-service lint: `pnpm --filter @instigi/training-service lint`
- Training-service tests pass: `pnpm --filter @instigi/training-service test`

#### Manual Verification:

- With the training-service running and a valid JWT, `DELETE /api/sessions/:id`
  on an in-progress session returns 200 and the session (with its exercises and
  sets) is gone; the same call on a finished session returns 409.

---

## Phase 2: Web-app — data layer

### Overview

Add a `discardSession` RTK Query mutation that calls the DELETE endpoint and
invalidates the active-session cache.

### Changes Required:

#### 1. Discard mutation

**File**: `apps/web-app/src/features/sessions/sessionsApi.ts`

**Intent**: Add a mutation for discarding a session and export its hook.

**Contract**: Add a `DiscardSessionArgs { id: string }` interface (export it
alongside the other arg types). Add a `discardSession` builder mutation:
`query: ({ id }) => ({ url: \`/${id}\`, method: 'DELETE' })`,
`transformResponse: (response: ApiResponse<{ id: string }>) => response.data`,
`invalidatesTags: (_result, _error, { id }) => [{ type: 'Session', id }, 'ActiveSession']`
(no `'History'`). Export `useDiscardSessionMutation` from the hooks block.

### Success Criteria:

#### Automated Verification:

- Web-app typecheck: `pnpm --filter @instigi/web-app typecheck`
- Web-app lint: `pnpm --filter @instigi/web-app lint`
- Web-app tests pass: `pnpm --filter @instigi/web-app test`

#### Manual Verification:

- (Covered by Phase 3 UI verification — no standalone manual step.)

---

## Phase 3: Web-app — discard UI

### Overview

Add a low-emphasis "Discard workout" button and a destructive confirmation
dialog to the session page; on success navigate back to `/workouts`.

### Changes Required:

#### 1. Discard button + confirm dialog

**File**: `apps/web-app/src/pages/workouts/SessionPage.tsx`

**Intent**: Let the user discard the current in-progress session, guarded by a
confirmation dialog, mirroring the existing finish flow.

**Contract**: Import `useDiscardSessionMutation`. Add
`const [discardSession, { isLoading: isDiscarding }] = useDiscardSessionMutation();`
plus `discardOpen` / `setDiscardOpen` state and a `discardError` state. Render a
low-emphasis error-colored "Discard workout" button in the `!readOnly` action
row next to Finish (e.g. `variant="text"`/`variant="outlined"`, `color="error"`).
Add a confirmation `Dialog` (title "Discard workout?", body warns the workout and
all its sets will be permanently deleted and cannot be recovered, actions
Cancel / Discard where the destructive button is `color="error"` and disabled
while `isDiscarding`). A `handleDiscard` calls `discardSession({ id }).unwrap()`,
closes the dialog and `navigate('/workouts')` on success, or surfaces
`discardError` in an `Alert` on failure (mirror `handleFinish`).

#### 2. Tests

**File**: `apps/web-app/src/pages/workouts/SessionPage.test.tsx`

**Intent**: Cover the discard confirm flow and that the control is hidden when
the session is finished.

**Contract**: Mock `useDiscardSessionMutation: () => [discardSession, { isLoading: false }]`
in the `sessionsApi` mock; add a `discardSession` vi.fn, reset it, and give it a
default `{ unwrap: () => Promise.resolve({}) }` in `beforeEach`. Add tests:
(a) clicking "Discard workout" then "Discard" calls `discardSession({ id: 'sess-1' })`
and navigates to `/workouts`; (b) the finished-session case asserts the "Discard
workout" button is absent (extend the existing "hides mutating controls" test or
add a sibling assertion).

### Success Criteria:

#### Automated Verification:

- Web-app typecheck: `pnpm --filter @instigi/web-app typecheck`
- Web-app lint: `pnpm --filter @instigi/web-app lint`
- Web-app tests pass: `pnpm --filter @instigi/web-app test`
- Web-app build: `pnpm --filter @instigi/web-app build`
- Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual Verification:

- The "Discard workout" button appears only on an in-progress session and opens
  a confirmation dialog.
- Confirming discard deletes the session and lands on `/workouts` with no active
  session; the discarded workout does not appear in history.
- Cancelling the dialog leaves the session untouched.
- A finished (read-only) session shows no Discard button.

---

## Testing Strategy

### Unit Tests:

- training-service: discard success, finished-session 409, missing/non-owned 404.
- web-app: SessionPage discard confirm → mutation + navigate; discard hidden when
  finished.

### Manual Testing Steps:

1. Start a workout, add an exercise, then open the session and click "Discard
   workout" → confirm → land on `/workouts` with no active session.
2. Verify the discarded session is not in history.
3. Start a session, open the discard dialog, cancel → session unchanged.
4. Open a finished workout from history → no Discard button is shown.

## References

- Similar implementation (guard + mutate): `services/training-service/src/controllers/sessions.ts:519` (`finishSession`)
- Success shape for id-only delete: `services/training-service/src/controllers/sessions.ts:313` (`removeSessionExercise`)
- UI confirm-dialog pattern: `apps/web-app/src/pages/workouts/SessionPage.tsx:237-269`
- Roadmap slice: `context/foundation/roadmap.md` S-05

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Backend — discard endpoint

#### Automated

- [x] 1.1 Types build: `pnpm --filter @instigi/types build` — fb16e8a
- [x] 1.2 Training-service typecheck: `pnpm --filter @instigi/training-service typecheck` — fb16e8a
- [x] 1.3 Training-service lint: `pnpm --filter @instigi/training-service lint` — fb16e8a
- [x] 1.4 Training-service tests pass: `pnpm --filter @instigi/training-service test` — fb16e8a

#### Manual

- [x] 1.5 With the training-service running and a valid JWT, `DELETE /api/sessions/:id` on an in-progress session returns 200 and removes it; on a finished session returns 409. — fb16e8a

### Phase 2: Web-app — data layer

#### Automated

- [x] 2.1 Web-app typecheck: `pnpm --filter @instigi/web-app typecheck` — 6881869
- [x] 2.2 Web-app lint: `pnpm --filter @instigi/web-app lint` — 6881869
- [x] 2.3 Web-app tests pass: `pnpm --filter @instigi/web-app test` — 6881869

### Phase 3: Web-app — discard UI

#### Automated

- [x] 3.1 Web-app typecheck: `pnpm --filter @instigi/web-app typecheck` — db33aea
- [x] 3.2 Web-app lint: `pnpm --filter @instigi/web-app lint` — db33aea
- [x] 3.3 Web-app tests pass: `pnpm --filter @instigi/web-app test` — db33aea
- [x] 3.4 Web-app build: `pnpm --filter @instigi/web-app build` — db33aea
- [x] 3.5 Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — db33aea

#### Manual

- [x] 3.6 The "Discard workout" button appears only on an in-progress session and opens a confirmation dialog — db33aea
- [x] 3.7 Confirming discard deletes the session and lands on /workouts with no active session; the discarded workout does not appear in history — db33aea
- [x] 3.8 Cancelling the dialog leaves the session untouched — db33aea
- [x] 3.9 A finished (read-only) session shows no Discard button — db33aea
