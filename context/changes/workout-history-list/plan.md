# Workout History List Implementation Plan

## Overview

Add a reverse-chronological list of past **finished** workouts (date, name, exercise count) so a completed workout appears immediately after saving. This is roadmap slice **S-04** (`workout-history-list`), which closes the north-star logging loop opened by S-02/S-03. It is a read-over-already-saved-data feature: one new list endpoint, a lightweight summary DTO + RTK Query hook, and a history list page + navigation.

## Current State Analysis

- **Backend** (`services/training-service/src/controllers/sessions.ts`): exposes `getActiveSession` (`where: { userId, endedAt: null }`, line 167-172) and `getSession` (`GET /:id`, any `endedAt`). There is **no endpoint that lists finished sessions**. DTO helpers (`toSessionDto`, line 102) always hydrate full exercises + entries via `exercisesInclude` (line 120) — heavier than a history list needs.
- **Routes** (`services/training-service/src/routes/sessions.ts`): `GET /active` is registered before `GET /:id`. A new `GET /history` is a distinct literal path; mounting it before `GET /:id` keeps intent obvious and avoids any ambiguity with the `:id` param route.
- **Types** (`packages/types/src/index.ts`): `WorkoutSession` (line 120) is the full nested shape. No lightweight session-summary type exists.
- **Web data layer** (`apps/web-app/src/features/sessions/sessionsApi.ts`): RTK Query slice with `tagTypes: ['ActiveSession', 'Session']`. `finishSession` (line 168) invalidates `ActiveSession` + `{ Session, id }` but nothing history-related.
- **Web UI**: `WorkoutsPage.tsx` only queries `getActiveSession`. `router.tsx` has `/workouts` and `/workouts/:sessionId` (read-only `SessionPage` when finished — built in S-03). `AppLayout.tsx` nav (`NAV_ITEMS` line 42, `BOTTOM_NAV_ITEMS` line 51) has Workouts + Exercises active and several disabled placeholders; no History entry.
- **Conventions**: strict `{ data: T }` success envelope; snapshot DTOs; Vitest + supertest with a mocked Prisma client for the service; web-app tests use `fireEvent` + `vi.mock` of the api module and `react-router`.

### Key Discoveries:

- `getActiveSession` filter pattern (`sessions.ts:167`) is the direct template for the finished-sessions filter (`endedAt: { not: null }`).
- Prisma `_count` (`_count: { select: { exercises: true } }`) yields `exerciseCount` without hydrating rows — the right tool for the summary DTO.
- `finishSession` is the write that must make a workout appear in history immediately (PRD US-01 acceptance criterion) — its `invalidatesTags` must include the new `History` tag.
- The read-only finished-session view already exists at `/workouts/:sessionId` (S-03), so history rows can link straight to it with no new detail work.

## Desired End State

A signed-in user sees a "History" navigation entry and a "View history" link on the Workouts page. Opening history shows their finished workouts newest-first, each row showing the workout name, its finish date, and how many exercises it contained. Clicking a row opens that workout read-only. Finishing a workout makes it appear at the top of history without a manual refresh. An empty history shows a friendly empty state; a load failure shows a retry affordance.

Verify: finish a workout → navigate to History → the just-saved workout is the top row with correct name/date/exercise count → click it → read-only SessionPage renders with sets intact.

## What We're NOT Doing

- **No dedicated detail view (FR-011)** — history rows reuse the existing read-only `/workouts/:sessionId` view. FR-011 remains a separate nice-to-have slice (S-06).
- **No pagination / infinite scroll** — return all finished workouts for the user (dataset is small at MVP scale).
- **No filtering, search, or sorting controls** — fixed reverse-chronological order by finish time.
- **No aggregate stats** (totals, streaks) — that is S-07 (progress-dashboard).
- **No schema or migration changes** — reads existing `workout_sessions` / `session_exercises`.
- **No changes to active-session or set-logging behavior.**

## Implementation Approach

Follow the same layering the S-03 slice used: shared type → backend endpoint + tests → web data layer → web UI. Keep the summary DTO minimal (`id`, `title`, `endedAt`, `exerciseCount`) and derive `exerciseCount` server-side via Prisma `_count` so the list query stays cheap. On the client, add a `History` cache tag and wire `finishSession` to invalidate it so the north-star "appears immediately" criterion holds. The history page reuses existing loading/error/empty patterns from `WorkoutsPage` and links rows to the read-only session view.

## Phase 1: Backend history endpoint

### Overview

Add the `SessionSummary` shared type and a `GET /api/sessions/history` endpoint returning the user's finished workouts newest-first, each with an exercise count. Cover it with supertest tests.

### Changes Required:

#### 1. Shared summary type

**File**: `packages/types/src/index.ts`

**Intent**: Add a lightweight DTO for history rows so the list endpoint and client don't traffic full nested sessions.

**Contract**: New exported interface `SessionSummary { id: string; title: string; endedAt: string; exerciseCount: number }`. `endedAt` is a non-null ISO string (history only lists finished sessions). Place it near the `WorkoutSession` definition.

#### 2. History controller

**File**: `services/training-service/src/controllers/sessions.ts`

**Intent**: Add a `listHistory` handler that returns the authenticated user's finished sessions, ordered by finish time descending, mapped to `SessionSummary`.

**Contract**: `export async function listHistory(req: AuthRequest, res: Response): Promise<void>`. Query `prisma.workoutSession.findMany` with `where: { userId, endedAt: { not: null } }`, `orderBy: { endedAt: 'desc' }`, and `select` of `id`, `title`, `endedAt`, plus `_count: { select: { exercises: true } }`. Map each row to `SessionSummary` (title `?? ''`, `endedAt` via `.toISOString()`, `exerciseCount` from `_count.exercises`). Respond `res.json({ data: summaries })`. A dedicated summary row type mirrors the existing `SessionRow` interface style at the top of the file.

#### 3. Route registration

**File**: `services/training-service/src/routes/sessions.ts`

**Intent**: Expose the new handler at a distinct literal path, before the `:id` param route.

**Contract**: Import `listHistory`; add `sessionsRouter.get('/history', requireAuth, listHistory)` immediately after the `/active` route and before `GET /:id`.

#### 4. Tests

**File**: `services/training-service/src/__tests__/sessions.test.ts`

**Intent**: Verify the endpoint returns finished sessions only, newest-first, with the summary shape and exercise count; and that it is auth-guarded.

**Contract**: New `describe('GET /api/sessions/history')` block. Extend the existing Prisma mock with `workoutSession.findMany` returning fixture rows that include `_count.exercises`. Assert: 200 with `data` array in `endedAt` desc order; each item has exactly `{ id, title, endedAt, exerciseCount }`; `exerciseCount` reflects the `_count`; 401 without a token. Follow the existing mock/supertest pattern in this file (Authorization headers are masked by tooling — append the new block via the same technique used for prior session suites if direct editing strips the header).

### Success Criteria:

#### Automated Verification:

- [ ] Types build: `pnpm --filter @instigi/types build`
- [ ] Training-service typecheck: `pnpm --filter @instigi/training-service typecheck`
- [ ] Training-service lint: `pnpm --filter @instigi/training-service lint`
- [ ] Training-service tests pass: `pnpm --filter @instigi/training-service test`

#### Manual Verification:

- [ ] With the training-service running and a valid JWT, `GET /api/sessions/history` returns finished sessions newest-first with correct `exerciseCount`; active (unfinished) sessions are excluded.

**Implementation Note**: After automated checks pass, pause for manual confirmation before proceeding.

---

## Phase 2: Web-app data layer

### Overview

Add a `getHistory` RTK Query endpoint returning `SessionSummary[]`, introduce a `History` cache tag, and invalidate it on finish so a saved workout shows up immediately.

### Changes Required:

#### 1. History query + cache tag

**File**: `apps/web-app/src/features/sessions/sessionsApi.ts`

**Intent**: Fetch the finished-workout summaries and keep them fresh when a workout is finished.

**Contract**: Add `'History'` to `tagTypes`. New endpoint `getHistory: builder.query<SessionSummary[], void>` hitting `{ url: '/history' }`, `transformResponse` unwrapping `ApiResponse<SessionSummary[]>`, `providesTags: ['History']`. Add `'History'` to `finishSession.invalidatesTags`. Export `useGetHistoryQuery`. Import `SessionSummary` from `@instigi/types`.

### Success Criteria:

#### Automated Verification:

- [ ] Web-app typecheck: `pnpm --filter @instigi/web-app typecheck`
- [ ] Web-app lint: `pnpm --filter @instigi/web-app lint`
- [ ] Web-app tests pass: `pnpm --filter @instigi/web-app test`

#### Manual Verification:

- [ ] (Covered by Phase 3 UI verification — no standalone manual step.)

**Implementation Note**: After automated checks pass, pause for manual confirmation before proceeding.

---

## Phase 3: History UI + navigation

### Overview

Add a `HistoryPage` listing finished workouts (name, finish date, exercise count) with loading/error/empty states and rows that navigate to the read-only session view; wire the `/workouts/history` route, a `History` nav entry, and a "View history" link on `WorkoutsPage`.

### Changes Required:

#### 1. History page

**File**: `apps/web-app/src/pages/workouts/HistoryPage.tsx` (new)

**Intent**: Render the finished-workout list with the same loading/error/empty affordances used elsewhere in Workouts, each row linking to `/workouts/:id`.

**Contract**: Default-export component using `useGetHistoryQuery()`. States: loading (`CircularProgress`), error (icon + message + Retry via `refetch`), empty (friendly "No finished workouts yet" message). List rows show `title`, a human-readable finish date (format `endedAt` with `Intl.DateTimeFormat`), and `"{n} exercise[s]"`; clicking a row calls `navigate('/workouts/' + id)`. Reuse MUI `List`/`Card` patterns from `WorkoutsPage`.

#### 2. Route

**File**: `apps/web-app/src/router.tsx`

**Intent**: Serve the history page inside the authenticated `AppLayout`.

**Contract**: Import `HistoryPage`; add `{ path: 'workouts/history', Component: HistoryPage }` inside the `AppLayout` children, **before** `workouts/:sessionId` so the literal wins over the param segment.

#### 3. Navigation entry

**File**: `apps/web-app/src/layouts/AppLayout.tsx`

**Intent**: Give history a first-class nav destination on desktop and mobile.

**Contract**: Add a `History` item (`to: '/workouts/history'`, a suitable MUI icon e.g. `HistoryIcon`) to `NAV_ITEMS` and `BOTTOM_NAV_ITEMS`. Keep `isActive` behavior correct — because `/workouts` uses `startsWith`, ensure the Workouts item does not appear active on `/workouts/history` (adjust matching so History and Workouts are mutually exclusive, e.g. exact-match Workouts or order-sensitive resolution).

#### 4. Workouts page link

**File**: `apps/web-app/src/pages/WorkoutsPage.tsx`

**Intent**: Provide an in-context path to history from the Workouts landing.

**Contract**: Add a "View history" `Button`/link that navigates to `/workouts/history`, visible regardless of active-session state.

#### 5. Tests

**Files**: `apps/web-app/src/pages/workouts/HistoryPage.test.tsx` (new); `apps/web-app/src/pages/WorkoutsPage.test.tsx` (extend)

**Intent**: Verify the history list renders rows in order, shows empty/error states, navigates on row click, and that WorkoutsPage exposes the history link.

**Contract**: Mock `sessionsApi` (`useGetHistoryQuery`) and `react-router` (`useNavigate`) following the existing `SessionPage.test.tsx` pattern. Assert: rows render with title + exercise count in returned order; empty state when `data` is `[]`; error state + retry when `isError`; clicking a row calls `navigate('/workouts/<id>')`. In `WorkoutsPage.test.tsx`, assert the "View history" control navigates to `/workouts/history` (add `useGetHistoryQuery` to its mock if the page imports it).

### Success Criteria:

#### Automated Verification:

- [ ] Web-app typecheck: `pnpm --filter @instigi/web-app typecheck`
- [ ] Web-app lint: `pnpm --filter @instigi/web-app lint`
- [ ] Web-app tests pass: `pnpm --filter @instigi/web-app test`
- [ ] Web-app build: `pnpm --filter @instigi/web-app build`
- [ ] Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

#### Manual Verification:

- [ ] History nav entry + "View history" link open the history page.
- [ ] Finished workouts show newest-first with correct name, finish date, and exercise count.
- [ ] Finishing a workout makes it appear at the top of history without manual refresh.
- [ ] Clicking a history row opens the read-only session view with sets intact.
- [ ] Empty state shows when there are no finished workouts.

**Implementation Note**: This is the final phase — the manual gate includes the cross-phase rollup (Phase 1's manual API check).

---

## Testing Strategy

### Unit / Integration Tests:

- Training-service supertest: `GET /api/sessions/history` returns finished-only, newest-first, correct `exerciseCount`; 401 unauthenticated.
- Web-app component tests: history list rendering/order, empty + error states, row navigation, WorkoutsPage history link.

### Manual Testing Steps:

1. Start `instigi-pg`, training-service, and web-app; log in.
2. Finish a workout; confirm it appears at the top of `/workouts/history` immediately.
3. Verify name, finish date, and exercise count per row.
4. Click a row → read-only session opens with sets intact.
5. (Fresh account or empty state) confirm the empty-history message.

## Migration Notes

None — no schema changes; reads existing finished sessions.

## References

- Roadmap slice: `context/foundation/roadmap.md` S-04
- PRD: FR-010 (`context/foundation/prd.md:137`), US-01 acceptance criteria (`context/foundation/prd.md:90`)
- Prior slice patterns: `context/changes/log-sets-finish-workout/plan.md`
- Backend template: `services/training-service/src/controllers/sessions.ts:167` (`getActiveSession`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Backend history endpoint

#### Automated

- [x] 1.1 Types build: `pnpm --filter @instigi/types build` — 1bc9c26
- [x] 1.2 Training-service typecheck: `pnpm --filter @instigi/training-service typecheck` — 1bc9c26
- [x] 1.3 Training-service lint: `pnpm --filter @instigi/training-service lint` — 1bc9c26
- [x] 1.4 Training-service tests pass: `pnpm --filter @instigi/training-service test` — 1bc9c26

#### Manual

- [x] 1.5 `GET /api/sessions/history` returns finished sessions newest-first with correct exerciseCount; active sessions excluded — 1bc9c26

### Phase 2: Web-app data layer

#### Automated

- [x] 2.1 Web-app typecheck: `pnpm --filter @instigi/web-app typecheck` — 1937865
- [x] 2.2 Web-app lint: `pnpm --filter @instigi/web-app lint` — 1937865
- [x] 2.3 Web-app tests pass: `pnpm --filter @instigi/web-app test` — 1937865

### Phase 3: History UI + navigation

#### Automated

- [x] 3.1 Web-app typecheck: `pnpm --filter @instigi/web-app typecheck` — 6d09015
- [x] 3.2 Web-app lint: `pnpm --filter @instigi/web-app lint` — 6d09015
- [x] 3.3 Web-app tests pass: `pnpm --filter @instigi/web-app test` — 6d09015
- [x] 3.4 Web-app build: `pnpm --filter @instigi/web-app build` — 6d09015
- [x] 3.5 Full monorepo green: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — 6d09015

#### Manual

- [x] 3.6 History nav entry + "View history" link open the history page — 6d09015
- [x] 3.7 Finished workouts show newest-first with correct name, finish date, and exercise count — 6d09015
- [x] 3.8 Finishing a workout makes it appear at the top of history without manual refresh — 6d09015
- [x] 3.9 Clicking a history row opens the read-only session view with sets intact — 6d09015
- [x] 3.10 Empty state shows when there are no finished workouts — 6d09015
