---
project: Instigi
context_type: brownfield
created: 2026-05-19
updated: 2026-05-19
checkpoint:
  current_phase: 7
  phases_completed: [1, 2, 3, 4, 5, 6]
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: context type
      decision: brownfield — existing auth-service and monorepo scaffold preserved
    - topic: primary persona
      decision: gym-goer (beginner to intermediate), currently tracking on paper or not at all
    - topic: must preserve
      decision: auth service API contracts (registration, login, JWT) and monorepo structure (Turborepo, pnpm workspaces, Docker)
    - topic: custom exercises in MVP
      decision: dropped — predefined library only in v1
    - topic: discard session
      decision: demoted to nice-to-have
    - topic: workout detail view
      decision: demoted to nice-to-have
    - topic: progress dashboard
      decision: demoted to nice-to-have
  frs_drafted: 11
  quality_check_status: accepted
---

## Current System

**System purpose:** Instigi is a workout tracker web app — the scaffolding is in place but the core product features have not yet been built.

**Key architecture:** Turborepo monorepo with pnpm workspaces. Services and apps run in Docker.

**Tech stack:**

- Frontend: Vite + React + TypeScript (`apps/web-app`, `apps/admin-app`)
- Backend: Node.js + Express + TypeScript (`services/auth-service`)
- Database: PostgreSQL via Prisma ORM
- Infra: Docker, Turborepo

**Current user base:** Pre-launch — no production users.

**Core functionality today:**

- Auth service: user registration, login, logout, JWT session management (built and compiled)
- Web app: routing shell with `/`, `/auth`, and 404 pages (pages are empty shells)
- Admin app: routing shell only

**Must preserve:**

- Auth service API contracts (registration, login, JWT) — must not change
- Monorepo structure (Turborepo, pnpm workspaces, Docker setup) — must not change

---

## Problem Statement & Motivation

**Pain / gap:** The fitness tracking market is crowded with apps that are either too complex (feature-bloated, distracting) or too rigid (not flexible enough for personal tracking). A gym-goer who currently tracks on paper or not at all has no fast, clean option to log sets and look back at past sessions.

**Why now:** The scaffolding (auth, routing, monorepo) is ready. The change is: build the core product features on top of what exists.

**Current workaround:** Paper notes or no tracking at all. Cost: lost weight/rep history, no visibility into progress, inability to use previous session data as a reference mid-workout.

---

## User & Persona

**Primary persona:** The Gym Regular (Beginner–Intermediate)

- **Role:** Gym-goer, 3–4x per week
- **Context:** Currently tracks on paper or not at all; loses track of weights used between sessions
- **Moment they reach for this app:** Mid-workout, between sets, phone in hand — they need to log the set they just finished as fast as possible
- **Pain:** Paper notes get lost; no way to see what weight they used last session for a given exercise

**Secondary persona:** The Self-Coached Athlete (Intermediate–Advanced) — trains with a structured program, needs precise progressive overload tracking. Serves this persona via the same core features; no special-casing in MVP.

---

## Access Control Changes

No auth model change — current model preserved as-is.

**Current model (preserved):**

- Authentication: email + password; JWT session management
- Role model: two roles exist — **regular user** and **admin**
- Regular user: accesses `web-app`; owns their own workout data (sessions, workout sets)
- Admin: accesses `admin-app`; capabilities not yet defined — see Open Questions

**What must not break:** The auth-service API contracts (register, login, logout, JWT validation endpoints) must remain unchanged.

---

## Success Criteria

### Primary

- A logged-in user can start a workout session, add exercises with sets/reps/weight, finish the session, and see the completed workout in their history.

### Secondary

- A simple dashboard shows total workouts completed and recent workout activity.

### Guardrails

- The auth service must not break — existing login/register flows continue to work after all changes.

**Timeline acknowledgment:** Committed to 2-week delivery window (after-hours). User accepted the sustained-effort cost on 2026-05-19. Scope to be defended rigorously — no feature additions mid-sprint.

---

## User Stories

### US-01: User logs a complete workout session

- **Given** a logged-in user on the home screen
- **When** they start a new session, add exercises with sets (recording values per exercise's configured metrics), and mark the session as finished
- **Then** the workout is saved and visible in their history with all exercises and set data intact

#### Acceptance Criteria

- Session cannot be saved empty (no exercises)
- Each set captures exactly the metrics the exercise is configured for (e.g., bench press: weight + reps; running: duration + distance)
- Completed workout appears in the history list immediately after saving

---

## Functional Requirements

### Authentication (preserved — existing auth-service)

- FR-001: User can register with email + password. Priority: must-have. Change: preserved

  > Socrates: Not challenged — this is already built and working.

- FR-002: User can log in and log out; session persists across browser reloads via JWT. Priority: must-have. Change: preserved
  > Socrates: Not challenged — this is already built and working.

### Workout Logging (new)

- FR-003: User can start a new workout session (named, defaults to current date). Priority: must-have. Change: new

  > Socrates: No counter-argument; it stands as written.

- FR-004: User can add exercises to an active session from a searchable predefined list. Priority: must-have. Change: new

  > Socrates: No counter-argument; it stands as written.

- FR-005: User can log sets for each exercise in an active session; values captured per set depend on the exercise's configured metrics (at least one of: WEIGHT, REPETITIONS, DURATION, DISTANCE). Priority: must-have. Change: new

  > Socrates: No counter-argument; exercise-specific metrics are the core domain rule that makes this non-trivial CRUD.

- FR-006: User can finish and save a completed workout session. Priority: must-have. Change: new

  > Socrates: No counter-argument; it stands as written.

- FR-007: User can discard an in-progress workout session. Priority: nice-to-have. Change: new
  > Socrates: Counter-argument considered: "Discard adds complexity (confirmation dialog, state cleanup) without adding MVP value — a user who wants to cancel just closes the app." Resolution: demoted to nice-to-have; not blocking the core flow.

### Exercise Library (new)

- FR-008: User can search and browse the predefined exercise list; each exercise ships pre-configured with its metric types. Priority: must-have. Change: new
  > Socrates: No counter-argument — predefined library with pre-configured metrics is the simplest path that enables the core flow.

### Workout History (new)

- FR-010: User can view a reverse-chronological list of past completed workouts (date, name, exercise count). Priority: must-have. Change: new

  > Socrates: No counter-argument; it stands as written.

- FR-011: User can view the full detail of a past workout (all exercises, sets, and values). Priority: nice-to-have. Change: new
  > Socrates: Counter-argument considered: "The list (FR-010) already proves the workout was saved — the detail view is extra UI work." Resolution: demoted to nice-to-have; history list is must-have.

### Progress Dashboard (new)

- FR-012: User can view a dashboard with total workouts completed and recent activity summary. Priority: nice-to-have. Change: new
  > Socrates: Counter-argument considered: "History list already provides recency — a separate dashboard duplicates information and consumes sprint time." Resolution: demoted to nice-to-have; useful but not blocking.

**Removed from MVP scope:**

- FR-009 (custom exercises) — dropped: only predefined exercises in v1. Moved to Non-Goals.

---

## Business Logic Changes

**Domain rule (new capability added):**
The app presents only the metrics relevant to an exercise when a user logs a set — determined by the exercise's pre-configured metric types (at least one of: WEIGHT, REPETITIONS, DURATION, DISTANCE) — so no irrelevant fields appear and no required fields are missed.

Supporting detail:

- Each predefined exercise ships with a fixed set of metric types (e.g., "Bench Press" → WEIGHT + REPETITIONS; "Running" → DURATION + DISTANCE).
- When a user adds an exercise to an active session and logs a set, the input form shows exactly the fields that exercise requires.
- The output of the rule is the correct, complete set record for that exercise type.
- The user encounters this rule every time they log a set — the form shape changes per exercise, invisibly enforcing completeness.

No existing domain logic is changed — the auth-service has no domain logic beyond credential validation.

---

## Non-Functional Requirements

- A user sees confirmation of a logged set within 2 seconds of submitting it on a mobile device.
- The product is usable on the latest two major versions of mainstream desktop and mobile browsers (iOS Safari, Android Chrome, desktop Chrome, Firefox, Safari).

---

## Constraints & Preserved Behavior

- The auth-service REST API must remain unchanged — no endpoint renames, no request/response contract changes.
- The auth-service's existing User table in Prisma must be preserved; new features extend the schema with new tables, not by modifying existing ones.
- The monorepo structure (Turborepo, pnpm workspaces, Docker service boundaries) must not be restructured.
- Data migration strategy for new tables: not yet decided — see Open Questions.

---

## Non-Goals

- **No custom exercises (user-created):** The exercise library is predefined-only in v1. Users cannot add their own exercises. Rationale: scope discipline for MVP; custom exercises add complexity to the metrics model.
- **No social features:** No workout sharing, friends, leaderboards, or competitive challenges. This is a single-user product in v1.
- **No native mobile app:** Web-first only — mobile experience is delivered via a responsive web app, not via App Store / Play Store.
- **No AI recommendations or smart suggestions:** No algorithmic workout recommendations, no "what to do next" intelligence.
- **No workout templates:** Users cannot save or reuse workout templates in v1. Each session is started fresh.
- **No nutrition tracking:** Out of scope entirely.
- **No advanced analytics or charts:** No trend graphs, no volume analysis, no visual progress charts. Basic stats (total workouts, recent activity) are the ceiling for v1.
- **No GDPR compliance tooling:** Deferred beyond v1.

---

## Open Questions

1. **What can the admin role do?** The `admin-app` exists in the monorepo but admin capabilities were not defined. Owner: user. Block: no (does not affect web-app MVP). Resolve before admin-app is built.

2. **Data migration strategy for new tables.** The new workout features will require new Prisma tables (WorkoutSession, Exercise, ExerciseSet, etc.). Whether these are added via Prisma migrations in the existing auth-service or in a new service is not yet decided. Owner: user. Block: yes (needed before implementation begins).

---

## Quality cross-check

All 6 brownfield quality gate items: **present**. Status: `accepted`.

- Access Control: present — model preserved, admin role flagged as open question
- Business Logic: present — one-sentence rule captured (exercise-metric-driven set logging)
- Project artifacts: present
- Timeline-cost acknowledgment: present — 2-week after-hours, accepted 2026-05-19
- Non-Goals: present — 8 explicit entries
- Preserved behavior: present — auth API contracts, schema extension rule, monorepo structure
