---
project: Instigi
version: 1
status: draft
created: 2026-07-01
updated: 2026-07-27
prd_version: 1
main_goal: speed
top_blocker: capacity
---

# Roadmap: Instigi

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Instigi is a pre-launch workout tracker whose authentication is built and working, but which has no core product yet. This roadmap builds the one thing that gives the app value: a gym-goer can log a workout mid-session as fast as possible and look back at previous sessions for reference. The single non-trivial domain rule is that each set captures exactly the metrics its exercise is configured for (e.g. bench press → weight + reps; running → duration + distance) — no irrelevant fields, no missing values.

## North star

**S-03: Log sets with per-exercise metrics and finish a complete workout** — this is the validation milestone: the moment a full workout is recorded (with the metrics domain rule enforced) and persisted proves the core hypothesis that gym-goers will log workouts here. The loop closes immediately after at **S-04** (seeing that workout in history), which completes the Primary Success Criterion end-to-end.

> "North star" here means the smallest end-to-end user-visible flow whose successful delivery would prove the core product hypothesis — placed as early as its Prerequisites allow, because everything else only matters if this works.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | workout-service-scaffold | (foundation) new workout data service stands up with its own tables and verifies auth-service tokens | — | Constraints (new dedicated service), Access Control | done |
| F-02 | exercises-page-layout | (foundation) exercises page shell, route, and layout regions stand up in the web app, ready for S-01 to fill with data | — | US-01, FR-008 | done |
| S-01 | exercise-library-browse | search and browse the predefined exercise library, each exercise pre-configured with its metric types | F-01, F-02 | US-01, FR-008 | done |
| S-02 | start-session-add-exercises | start a named workout session and add exercises to it from the library | S-01, F-01 | US-01, FR-003, FR-004 | done |
| S-03 | log-sets-finish-workout | log sets capturing exactly each exercise's configured metrics, then finish and save the workout | S-02 | US-01, FR-005, FR-006 | done |
| S-04 | workout-history-list | view a reverse-chronological list of past completed workouts | S-03 | US-01, FR-010 | done |
| S-05 | discard-session | discard an in-progress workout session | S-02 | FR-007 | proposed |
| S-06 | workout-detail-view | view the full detail of a past workout (all exercises, sets, values) | S-04 | FR-011 | proposed |
| S-07 | progress-dashboard | view a dashboard with total workouts completed and recent activity | S-04 | FR-012 | proposed |
| S-08 | web-app-auth-flow | sign up, sign in, stay signed in across reloads, and sign out from the web app | — | US-01, FR-001, FR-002 | done |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core logging loop | `F-01` / `F-02` → `S-01` → `S-02` → `S-03` → `S-04` | The must-have slices leading to the north star, in a strict speed-first sequence. `F-02` (exercises page layout) is a parallel enabler that joins the chain at `S-01`. |
| B | Enhancements & dashboard | `S-05` (parallel with `S-03`/`S-04`, joins Stream A at `S-02`) → `S-06` / `S-07` (parallel, join at `S-04`) | Nice-to-have PRD FRs; park candidates under the speed goal. Parallelizable to spend the capacity blocker well. |
| C | Account access (web) | `S-08` | Frontend auth experience against the unchanged auth-service; independent of the workout track, runs fully parallel with Stream A. |

## Baseline

What's already in place in the codebase as of `2026-07-01` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — React 19 + Vite + MUI, `react-router` shell (`apps/web-app/src/router.tsx`). `packages/ui` has `Button`, `TextField`, `AuthForm` only (`packages/ui/src/index.ts`). Pages are home/auth/404; no workout/session/exercise/history UI exists.
- **Backend / API:** present — Express 5 `services/auth-service` only, exposing `/health` and `/api/auth` (`login`, `register`, `refresh`) (`services/auth-service/src/app.ts`, `routes/auth.ts`). No workout endpoints; no second service.
- **Data:** partial — Prisma 7 + PostgreSQL; `schema.prisma` has `User` + `Role` under the `auth` schema only (`services/auth-service/prisma/schema.prisma`). No workout/session/exercise/set models; no seed script.
- **Auth:** present — JWT mint/verify, refresh tokens, and a `requireAuth` middleware exist and are operational (`services/auth-service/src/jwt.ts`, `middleware/auth.ts`, `controllers/auth.ts`). Covers preserved FR-001 (register) and FR-002 (login/logout/session) — no slice needed.
- **Deploy / infra:** partial — Dockerfiles for all three services + `docker-compose.yml` (postgres, pgadmin, auth-service, web-app, admin-app, caddy). No CI/CD workflows. Railway is the recommended MVP host per `context/foundation/infrastructure.md`.
- **Observability:** absent — only a basic `/health` endpoint (`services/auth-service/src/app.ts`). No logging library, error tracking, or metrics.

## Foundations

### F-01: New workout data service scaffold

- **Outcome:** (foundation) a new dedicated workout service is stood up alongside the auth service, connected to its own Postgres tables, able to verify auth-service-issued JWTs, and reachable through the existing container/compose wiring — no workout tables prebuilt beyond what S-01 needs.
- **Change ID:** workout-service-scaffold
- **PRD refs:** Constraints & Compatibility (new tables live in a new dedicated service; monorepo structure preserved; auth-service API unchanged), Access Control (verify existing tokens; user owns their data)
- **Unlocks:** S-01, S-02, S-03, S-04 — every workout capability needs a service that persists workout data and authenticates the owning user.
- **Prerequisites:** — (builds on present Auth and present PostgreSQL baseline)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - How does the workout service verify auth-service JWTs (shared secret vs. public key / introspection)? — Owner: team. Block: no (auth-service already mints tokens; standard verification pattern).
- **Risk:** Sequenced first because no user-facing workout slice can persist data or identify its owner without it. Kept minimal (progressive disclosure) so most schema grows inside the slices that consume it; over-scoping this into a "whole data layer" would starve the 2-week budget.
- **Status:** done

### F-02: Exercises page layout scaffold

- **Outcome:** (foundation) the exercises page shell exists in the web app — its route entry, page layout, and layout regions (search area, list/grid region, empty and loading states) — ready for a data-browsing slice to fill in, with no data fetching or business logic beyond what S-01 needs.
- **Change ID:** exercises-page-layout
- **PRD refs:** US-01, FR-008 (the surface this scaffolds is the exercise library browse experience)
- **Unlocks:** S-01 — the exercise-library browse slice fills this scaffold with real, searchable, metric-configured exercise data; without the page shell in place S-01 would have to build layout and browse behaviour in one step.
- **Prerequisites:** — (builds on the present web-app router/shell and `packages/ui` baseline)
- **Parallel with:** F-01 and S-08 (web-app frontend only; independent of the workout service and auth track)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Kept minimal (progressive disclosure) — layout regions only, no data or domain logic, so it can't drift into a "build the whole exercises UI" horizontal project. S-01 still integrates and exercises the page through a real user capability. Under the speed goal this is a small, low-risk enabler that can run in parallel to spend the capacity blocker well.
- **Status:** done

## Slices

### S-01: Browse the exercise library

- **Outcome:** user can search and browse the predefined exercise list, each exercise pre-configured with its metric types.
- **Change ID:** exercise-library-browse
- **PRD refs:** US-01, FR-008
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - What is the seed set of predefined exercises and each one's metric configuration? — Owner: user. Block: no (a starter set is enough for MVP).
- **Risk:** First user-visible slice; also seeds the metric-configured exercise data that the whole logging flow depends on. Low risk — read-only browse over seeded data. Sequenced before session work because you can't add exercises you can't see.
- **Status:** done

### S-02: Start a session and add exercises

- **Outcome:** user can start a named workout session (defaulting to the current date) and add exercises to it from the library.
- **Change ID:** start-session-add-exercises
- **PRD refs:** US-01, FR-003, FR-004
- **Prerequisites:** S-01, F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Establishes the active-session model and the session↔exercise relationship the rest of the loop builds on. Sequenced after the library because adding exercises requires a browsable library.
- **Status:** done

### S-03: Log sets with per-exercise metrics and finish the workout

- **Outcome:** user can log sets capturing exactly the metrics each exercise is configured for, then finish and save the completed workout.
- **Change ID:** log-sets-finish-workout
- **PRD refs:** US-01, FR-005, FR-006
- **Prerequisites:** S-02
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:**
  - How are per-exercise metric types (WEIGHT, REPETITIONS, DURATION, DISTANCE) modelled so set values are complete and correctly typed per exercise? — Owner: team. Block: no (resolvable during `/10x-plan`).
- **Risk:** North-star slice and the one genuinely non-trivial part — the metric-completeness domain rule lives here. A session cannot be saved empty (acceptance criterion). This is where the modest data/domain-model investment is spent; everything upstream exists to make this slice real.
- **Status:** done

### S-04: View workout history

- **Outcome:** user can view a reverse-chronological list of past completed workouts (date, name, exercise count).
- **Change ID:** workout-history-list
- **PRD refs:** US-01, FR-010
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Closes the north-star loop — a completed workout must appear in history immediately after saving (acceptance criterion). Low risk read-over-saved-data; sequenced last in the core chain because it needs saved workouts to list.
- **Status:** done

### S-05: Discard an in-progress session

- **Outcome:** user can discard an in-progress workout session.
- **Change ID:** discard-session
- **PRD refs:** FR-007
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nice-to-have; adds confirmation + state cleanup without core value. Under the speed goal this is a park candidate — sequence only if capacity remains. Parallelizable off S-02.
- **Status:** proposed

### S-06: View a past workout in detail

- **Outcome:** user can view the full detail of a past workout (all exercises, sets, and values).
- **Change ID:** workout-detail-view
- **PRD refs:** FR-011
- **Prerequisites:** S-04
- **Parallel with:** S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nice-to-have; the history list already proves a workout was saved. Park candidate under the speed goal.
- **Status:** proposed

### S-07: View a progress dashboard

- **Outcome:** user can view a dashboard with total workouts completed and a recent-activity summary.
- **Change ID:** progress-dashboard
- **PRD refs:** FR-012
- **Prerequisites:** S-04
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nice-to-have (Secondary Success Criterion); largely duplicates recency already visible in history. Park candidate under the speed goal.
- **Status:** proposed

### S-08: Rebuild the web-app sign in / sign up flow

- **Outcome:** user can sign up, sign in, stay signed in across browser reloads, and sign out directly from the web app.
- **Change ID:** web-app-auth-flow
- **PRD refs:** US-01 (enables the "logged-in user on the home screen" precondition), FR-001, FR-002
- **Prerequisites:** — (builds on the present Auth backend and the present web-app router/shell baseline)
- **Parallel with:** F-01 and the entire workout track (independent — touches only the web app and the unchanged auth-service API)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The auth-service is already built and its API contracts must NOT change (PRD guardrail) — this slice is purely web-app frontend work: replace the current shell `AuthPage` with a real auth experience and wire client-side session/token handling and data fetching against the existing endpoints. Low backend risk; the load-bearing care is preserving session persistence across reloads and clean sign-out. Sequenced independently and can go first under the speed goal since a real user must be able to sign in before any workout slice is usable end-to-end. (Client state + data-fetching approach is a user-chosen implementation detail — Redux Toolkit + RTK Query — to be confirmed and detailed in `/10x-plan`.)
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | workout-service-scaffold | Scaffold new workout data service (tables + JWT verification) | yes | Run `/10x-plan workout-service-scaffold` |
| F-02 | exercises-page-layout | Scaffold the exercises page layout in the web app | yes | Run `/10x-plan exercises-page-layout`; web-app frontend only, unlocks S-01 |
| S-01 | exercise-library-browse | Browse & search the predefined exercise library | no | Needs F-01 and F-02 done |
| S-02 | start-session-add-exercises | Start a workout session and add exercises | no | Needs S-01 done |
| S-03 | log-sets-finish-workout | Log sets with per-exercise metrics and finish workout | no | North star; needs S-02 done |
| S-04 | workout-history-list | View reverse-chronological workout history | no | Needs S-03 done |
| S-05 | discard-session | Discard an in-progress session | no | Nice-to-have; needs S-02 done |
| S-06 | workout-detail-view | View full detail of a past workout | no | Nice-to-have; needs S-04 done |
| S-07 | progress-dashboard | Progress dashboard (totals + recent activity) | no | Nice-to-have; needs S-04 done |
| S-08 | web-app-auth-flow | Rebuild web-app sign in / sign up flow (client session + data fetching) | yes | Run `/10x-plan web-app-auth-flow`; independent of the workout track. Chosen approach: Redux Toolkit + RTK Query |

This table is the clean handoff to Jira/Linear or any MCP-backed backlog. One row per `F-NN` / `S-NN`.

## Open Roadmap Questions

1. **What can the admin role do?** — Owner: user. Block: `admin-app work only` (roadmap-wide for admin; does NOT block any workout slice above — the admin app is out of MVP scope per PRD). Resolve before any admin-app features are roadmapped.

## Parked

- **Custom (user-created) exercises** — Why parked: PRD §Non-Goals — predefined-only in v1; custom exercises complicate the metrics model.
- **Social features (sharing, friends, leaderboards)** — Why parked: PRD §Non-Goals — single-user product in v1.
- **Native mobile app** — Why parked: PRD §Non-Goals — web-first responsive only, no app-store distribution.
- **AI recommendations / smart suggestions** — Why parked: PRD §Non-Goals.
- **Workout templates (save/reuse)** — Why parked: PRD §Non-Goals — each session starts fresh in v1.
- **Nutrition tracking** — Why parked: PRD §Non-Goals — out of scope entirely.
- **Advanced analytics / trend charts / volume analysis** — Why parked: PRD §Non-Goals — basic stats are the v1 ceiling.
- **GDPR compliance tooling** — Why parked: PRD §Non-Goals — deferred beyond v1.
- **Admin app features** — Why parked: PRD §Open Questions — admin capabilities undefined; deferred beyond MVP.

## Done

(Empty on first generation. `/10x-archive` appends here — and flips the item's `Status` to `done` — when a change whose `Change ID` matches an item is archived. Do NOT pre-populate.)

- **F-02: (foundation) the exercises page shell exists in the web app — its route entry, page layout, and layout regions (search area, list/grid region, empty and loading states) — ready for a data-browsing slice to fill in, with no data fetching or business logic beyond what S-01 needs.** — Archived 2026-07-09 → `context/archive/2026-07-08-exercises-page-layout/`. Lesson: —.
- **F-01: (foundation) a new dedicated workout service is stood up alongside the auth service, connected to its own Postgres tables, able to verify auth-service-issued JWTs, and reachable through the existing container/compose wiring — no workout tables prebuilt beyond what S-01 needs.** — Archived 2026-07-10 → `context/archive/2026-07-02-workout-service-scaffold/`. Lesson: —.
- **S-08: user can sign up, sign in, stay signed in across browser reloads, and sign out directly from the web app.** — Archived 2026-07-10 → `context/archive/2026-07-08-web-app-auth-flow/`. Lesson: —.
- **S-01: user can search and browse the predefined exercise list, each exercise pre-configured with its metric types.** — Archived 2026-07-16 → `context/archive/2026-07-10-exercise-library-browse/`. Lesson: —.
- **S-02: user can start a named workout session (defaulting to the current date) and add exercises to it from the library.** — Archived 2026-07-27 → `context/archive/2026-07-16-start-session-add-exercises/`. Lesson: —.
