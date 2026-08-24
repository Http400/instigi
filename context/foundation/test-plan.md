# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-08-24 (Risk #6 local Playwright coverage added; Phase 4 CI gate pending)

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `apps/*/src`, `services/*/src`, `packages/*/src` (excluding node_modules, dist, generated code, archive).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | A set is persisted that violates the per-exercise metric rule — an undeclared metric, a missing required metric, or a disallowed entry type — silently corrupting workout history | High | High | PRD *Business Logic Changes*; data-model *Validation rules*; interview Q1, Q3; hot-spot dir `services/training-service/src/controllers` (5 commits/30d) |
| 2 | One user reads or mutates another user's session / exercise / entry because the endpoint checks authentication but not ownership (IDOR) | High | Medium | PRD *Access Control* (user owns own data); `services/AGENTS.md`; abuse lens; hot-spot dir `services/training-service/src/routes` (4 commits/30d) |
| 3 | A completed workout is lost or partially saved on Finish (session persists but entries don't, or Finish silently no-ops) | High | Medium | interview Q1 ("problems with saving/editing data"); hot-spot dir `services/training-service/src/controllers` (5 commits/30d), `apps/web-app/src/features` (13 commits/30d) |
| 4 | A training-service endpoint returns a shape other than `{ data }` on success or `{ message, code, statusCode }` on error, and the web app renders blank or mishandles the error | Medium | Medium | `AGENTS.md` hard rule (strict response shape); hot-spot dir `packages/types/src` (3 commits/30d), `apps/web-app/src/features` (13 commits/30d) |
| 5 | A session with no exercises or no sets is saved and pollutes history, violating "session cannot be saved empty" | Medium | Medium | PRD US-01 acceptance criteria; hot-spot dir `services/training-service/src/controllers` (5 commits/30d) |
| 6 | The end-to-end loop (start → add exercises → log sets → finish → appears in history) breaks at a seam even though each unit passes | High | Medium | roadmap north star (S-03/S-04); PRD *Primary Success Criterion*; interview Q3; no e2e gate exists in CI |

**Impact × Likelihood rubric.** Both axes scored coarse High / Medium / Low
so two readers agree on the same row; the goal is ordering, not false
precision. Protect High × High first (Risk #1). High-impact ×
Low-likelihood scenarios (e.g. Postgres host outage) belong to
observability/alerting, not a test.

**Abuse / security lens.** The product has authentication and accepts user
input, so the map includes an authorization abuse row (Risk #2, IDOR) and
server-side validation-parity rows (Risks #1, #5). JWT verification in the
new training-service is folded into Risk #2's grounding context rather than
a separate row — an `auth-middleware` test already exists, so a standalone
row would be speculative.

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Server rejects a set whose values contain an undeclared metric, omit a required metric, or use a disallowed entry type; accepts a valid one | "The client already filters fields, so the server can trust the input" — server-side validation parity | Where the session-exercise metric snapshot is validated against an entry; whether `metricsSnapshot` is the source of truth | integration (supertest, mocked db) | assertion copied from the validation implementation (oracle problem); happy-path-only |
| #2 | User A's token cannot read or mutate User B's session / exercise / entry — receives 403/404, not 200 | "Logged-in implies authorized" | How ownership is derived from the JWT subject versus the resource's `userId` | integration (abuse path) | testing only the happy owner path |
| #3 | After Finish, the session and all its entries are retrievable together; a mid-save failure leaves no half-written workout | "Response 200 means everything persisted" | The persistence / transaction boundary of finish; how entries relate to the session write | integration | asserting only the final status code |
| #4 | Every endpoint returns exactly `{ data }` on success and `{ message, code, statusCode }` on error | "TS types guarantee the runtime shape" | The shared response contract in `packages/types` and how `sessionsApi` maps responses | contract / integration | snapshot without asserting the discriminating fields |
| #5 | Saving a session with zero exercises or zero sets is rejected by the server | "The UI prevents it, so the backend need not" | Where the empty-session guard lives (client versus server) | integration | a UI-only test that never exercises the API |
| #6 | The full logging loop persists and surfaces the workout in history | "Green units imply a green flow" | The seams between UI session state, `sessionsApi`, and the training-service | e2e (promoted — no cheaper layer covers the cross-boundary seam) | e2e where integration would catch a sub-step regression |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Session integrity & domain rule | Prove the training-service enforces the metric rule, the empty-session guard, and a durable finish | #1, #3, #5 | integration | complete | context/changes/testing-session-integrity-domain-rule/ |
| 2 | Access control & ownership | Prove cross-user isolation on the training-service endpoints | #2 | integration (abuse) | not started | — |
| 3 | API contract parity | Lock the `{ data }` / error shape across endpoints and the web-app mapping | #4 | contract / integration | not started | — |
| 4 | Critical-path e2e & gate | Cover the north-star logging loop end-to-end and wire the e2e CI gate | #6 | e2e, gates | not started | — |

**Status vocabulary** (fixed — parser literals):

| Value | Meaning |
|-------|---------|
| `not started` | No change folder for this rollout phase yet. |
| `change opened` | `context/changes/<id>/` exists with `change.md`; research not done. |
| `researched` | `research.md` exists in the change folder. |
| `planned` | `plan.md` exists with a `## Progress` section. |
| `implementing` | Progress section has at least one `[x]` and at least one `[ ]`. |
| `complete` | Progress section is fully `[x]`. |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration (apps) | Vitest + @testing-library/react | 4.x | jsdom; `src/test-setup.ts`; co-located `*.test.tsx` |
| unit + integration (services) | Vitest + supertest | 4.x | Test the `app` export; `vi.mock('../db.js')` at top of file; Prisma client mocked |
| API mocking | none dedicated | — | Services mock the db module directly; web app mocks `sessionsApi` fetch |
| e2e | Playwright | 1.62.x | App-scoped config in `apps/web-app`; storage-state auth; north-star loop covered locally, CI gate pending |
| accessibility | none | — | Out of scope for this rollout (see §7) |

**Stack grounding tools (current session):**
- Docs: none — Context7 / dedicated docs MCP not available in current session; relied on local manifests, configs, and `AGENTS.md`; checked: 2026-08-21
- Search: web_search (generic) available — not used; stack facts came from local configs; checked: 2026-08-21
- Runtime/browser: Playwright CLI + bundled Chromium available; app-scoped runner and storage-state setup verified against the real local services; checked: 2026-08-24
- Provider/platform: GitHub MCP available (read-only) — not used for this write; relevant later for CI-gate verification; checked: 2026-08-21

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required after §3 Phase <N>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI (`ci.yml`) | required | syntactic / type drift |
| unit + integration | local + CI (`test.yml`) | required | logic regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 4 | broken north-star logging loop |
| post-edit hook | local (agent loop) | optional | regressions at edit time |
| visual diff (deterministic) | CI on PR | optional | rendering regressions |
| pre-prod smoke | between merge + prod | optional | environment-specific failures |

lint, typecheck, and unit+integration are already wired in `.github/workflows/`.
The e2e gate does not exist yet and is wired by §3 Phase 4.

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase <N>."

### 6.1 Adding a service integration test (training-service)

- **Location**: co-located in `services/training-service/src/__tests__/<feature>.test.ts`. Extend the existing file for a route group rather than adding a new one — the canonical example is `sessions.test.ts`.
- **Harness**: call `vi.mock('../db.js', () => ({ prisma: { …vi.fn() per model.method } }))` at the very top of the file (before any import of app), set `process.env['JWT_SECRET']`, then `const { app } = await import('../app.js')` and `const { prisma } = await import('../db.js')`. Reset every mock in `beforeEach`. Authenticate with the local `signToken(userId?)` helper and `.set('Authorization', ` + "`Bearer ${signToken()}`" + `)`.
- **Mock sequencing**: mocks must resolve in the controller's call order. For a set write that is: `workoutSession.findFirst` (ownership + finished-guard) → `sessionExercise.findFirst` (snapshot) → entry op. Order the `mockResolvedValueOnce` calls to match, or the test asserts the wrong branch.
- **Snapshot is the source of truth**: the metric/entry-type rule is validated against the session-exercise `metricsSnapshot` / `allowedEntryTypesSnapshot`, never the live `ExerciseDefinition`. Mock the snapshot via `sessionExercise.findFirst`; reuse fixtures like `benchExerciseSnapshot` / `repsOnlyExerciseSnapshot`.
- **Oracle avoidance**: derive expected results from the domain rule (data-model), not from the controller's `validateEntryValues`. Assert both `res.status`/`res.body.code` and, on a rejection, that the mutating Prisma mock was NOT called (`expect(prisma.exerciseEntry.create).not.toHaveBeenCalled()`).
- **Run**: `pnpm --filter @instigi/training-service test`.

### 6.2 Adding an access-control / ownership test

- TBD — see §3 Phase 2 for the cross-user IDOR pattern on training-service endpoints.

### 6.3 Adding an API response-contract test

- TBD — see §3 Phase 3 for asserting the `{ data }` / `{ message, code, statusCode }` shape and the web-app `sessionsApi` mapping.

### 6.4 Adding an e2e test for a critical flow

- **Location**: `apps/web-app/e2e/<risk-name>.spec.ts`, one risk-tied test per
  file. Model new specs on `seed.spec.ts` and follow `e2e/AGENTS.md`.
- **Auth**: use the setup project's `playwright/.auth/user.json`; individual
  specs never log in through the UI.
- **Boundaries**: keep auth, routing, APIs, and Postgres real. Mock only external
  nondeterministic providers, and only at the network boundary.
- **Locators and waits**: use `getByRole` / `getByLabel` / `getByText`; wait for
  URLs, responses, and visible state. Never use CSS/XPath or `waitForTimeout`.
- **Isolation**: use unique titles/IDs, remove any active session during setup,
  and delete created sessions in `finally` through the JWT-protected
  `DELETE /training/e2e/sessions/:id` endpoint.
- **Canonical example**: `workout-logging-loop.spec.ts` covers Risk #6 across
  start → rename → add Bench Press → log set → finish → history → read-only
  detail.
- **Run one spec**:
  `pnpm --filter @instigi/web-app exec playwright test e2e/workout-logging-loop.spec.ts --project=chromium`.

### 6.5 Adding a web-app component/page test

- **Location**: co-located `*.test.tsx` beside the component/page (existing convention, e.g. `apps/web-app/src/pages/workouts/`).
- **Run locally**: `pnpm --filter @instigi/web-app test`.
- Existing references already cover this; extend rather than adding a new recipe.

### 6.6 Per-rollout-phase notes

(Optional. After each phase lands, `/10x-implement` appends a 2–3 line note here capturing anything surprising the rollout phase taught.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **UI component wrappers (`packages/ui`)** — thin MUI pass-throughs that forward props; the framework is the test. Re-evaluate if a wrapper gains real logic. (Source: Phase 2 interview Q5.)
- **Testing configuration / plumbing** — Vitest configs, test setup files, mocks-as-infrastructure. Not asserted directly; they are exercised by the tests that use them. Re-evaluate if config drift causes silent test skips. (Source: Phase 2 interview Q5.)
- **Infrastructure** — Dockerfiles, docker-compose, CI YAML, deployment wiring. Named as gates in §5 but not unit/integration tested. Re-evaluate if a deploy-time failure becomes a recurring incident. (Source: Phase 2 interview Q5.)
- **admin-app features** — a routing shell with no product features yet; nothing to protect. Re-evaluate when admin capabilities are defined (PRD Open Question 1).

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-08-21
- Stack versions last verified: 2026-08-21
- AI-native tool references last verified: 2026-08-21

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
