---
project: Instigi
version: 1
status: draft
created: 2026-05-19
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: 2
  hard_deadline: null
  after_hours_only: true
---

## Current System Overview

Instigi is a workout tracker web app currently in pre-launch state — the authentication infrastructure is built and operational, but the core product features do not yet exist.

**Key architecture:** Turborepo monorepo with pnpm workspaces. Services and apps are containerized with Docker.

**Tech stack:**

- Frontend: Vite + React + TypeScript (`apps/web-app`, `apps/admin-app`)
- Backend: Node.js + Express + TypeScript (`services/auth-service`)
- Database: PostgreSQL via Prisma ORM
- Infrastructure: Docker, Turborepo

**Current user base:** Pre-launch — no production users.

**Core functionality today:**

- Authentication service: user registration, login, logout, and token-based session management (built and compiled)
- Web app: routing shell with home (`/`), auth (`/auth`), and 404 pages — no feature pages built
- Admin app: routing shell only — no feature pages built

---

## Problem Statement & Motivation

A gym-goer who tracks workouts on paper or not at all has no fast, clean option to log sets mid-workout and look back at previous sessions for reference. The fitness tracking market is crowded with apps that are either too complex (feature-bloated, distracting) or too rigid (not flexible enough for personal tracking).

The authentication scaffolding is in place; this change builds the core product features on top of it. Without these features, the app is a shell with no user value.

**Current workaround:** Paper notes or no tracking at all. Cost: lost weight and repetition history, no visibility into progress, inability to reference last session's data mid-workout.

---

## User & Persona

**Primary persona: The Gym Regular (Beginner–Intermediate)**

- **Role:** Gym-goer, 3–4 times per week
- **Context:** Currently tracks on paper or not at all; loses track of weights used between sessions
- **Moment they reach for this app:** Mid-workout, between sets, phone in hand — they need to log the set they just finished as fast as possible
- **Pain:** Paper notes get lost; no way to see what weight they used last session for a given exercise

### Secondary persona

The Self-Coached Athlete (Intermediate–Advanced) — trains with a structured self-written program, needs precise progressive overload tracking. Served by the same core features as the primary persona; no special-casing in this change.

---

## Success Criteria

### Primary

- A logged-in user can start a workout session, add exercises with sets (recording values per each exercise's configured metrics), finish the session, and see the completed workout in their history.

### Secondary

- A simple dashboard shows total workouts completed and recent workout activity.

### Guardrails

- The authentication service must not break — existing login and registration flows continue to work correctly after all changes land.

---

## User Stories

### US-01: User logs a complete workout session

- **Given** a logged-in user on the home screen
- **When** they start a new session, add exercises with sets (recording values per exercise's configured metrics), and mark the session as finished
- **Then** the workout is saved and visible in their history with all exercises and set data intact

#### Acceptance Criteria

- Session cannot be saved empty (no exercises added)
- Each set captures exactly the metrics the exercise is configured for (e.g., bench press: weight + reps; running: duration + distance)
- Completed workout appears in the history list immediately after saving

---

## Scope of Change

### Authentication (preserved)

- [preserved] User can register with email + password. FR-001. Priority: must-have.

  > Socrates: Not challenged — this is already built and working.

- [preserved] User can log in and log out; session persists across browser reloads. FR-002. Priority: must-have.
  > Socrates: Not challenged — this is already built and working.

### Workout Logging (new)

- [new] User can start a new workout session (named; defaults to current date). FR-003. Priority: must-have.

  > Socrates: No counter-argument; it stands as written.

- [new] User can add exercises to an active session from a searchable predefined list. FR-004. Priority: must-have.

  > Socrates: No counter-argument; it stands as written.

- [new] User can log sets for each exercise in an active session; values captured per set depend on the exercise's configured metrics (at least one of: WEIGHT, REPETITIONS, DURATION, DISTANCE). FR-005. Priority: must-have.

  > Socrates: No counter-argument; exercise-specific metrics are the core domain rule that makes this non-trivial CRUD.

- [new] User can finish and save a completed workout session. FR-006. Priority: must-have.

  > Socrates: No counter-argument; it stands as written.

- [new] User can discard an in-progress workout session. FR-007. Priority: nice-to-have.
  > Socrates: Counter-argument considered: "Discard adds complexity (confirmation dialog, state cleanup) without adding MVP value — a user who wants to cancel just closes the app." Resolution: demoted to nice-to-have; not blocking the core flow.

### Exercise Library (new)

- [new] User can search and browse the predefined exercise list; each exercise ships pre-configured with its metric types. FR-008. Priority: must-have.
  > Socrates: No counter-argument — predefined library with pre-configured metrics is the simplest path that enables the core flow.

### Workout History (new)

- [new] User can view a reverse-chronological list of past completed workouts (date, name, exercise count). FR-010. Priority: must-have.

  > Socrates: No counter-argument; it stands as written.

- [new] User can view the full detail of a past workout (all exercises, sets, and values). FR-011. Priority: nice-to-have.
  > Socrates: Counter-argument considered: "The list (FR-010) already proves the workout was saved — the detail view is extra UI work." Resolution: demoted to nice-to-have; history list is must-have.

### Progress Dashboard (new)

- [new] User can view a dashboard with total workouts completed and recent activity summary. FR-012. Priority: nice-to-have.
  > Socrates: Counter-argument considered: "History list already provides recency — a separate dashboard duplicates information and consumes sprint time." Resolution: demoted to nice-to-have; useful but not blocking.

---

## Constraints & Compatibility

- **API backward compatibility:** The authentication service's API contracts must remain unchanged — no endpoint renames, no request or response contract changes.
- **Database schema extension:** The existing user data structure must not be modified; new workout features must extend the system with new data tables only.
- **Monorepo structure:** The monorepo structure (workspaces, service boundaries, containerization setup) must not be restructured.
- **Data strategy for new tables:** New workout-related data tables will live in new, dedicated services separate from the existing authentication service.

---

## Business Logic Changes

**New domain rule added:**
The values a user is asked to record for a set are exactly those required by the exercise type — determined by the exercise's pre-configured metric types — so no irrelevant fields appear and no required values are omitted.

Supporting detail:

- Each predefined exercise is configured with a fixed set of metric types (e.g., "Bench Press" requires WEIGHT and REPETITIONS; "Running" requires DURATION and DISTANCE).
- When a user logs a set for an exercise, they record values for exactly the metrics that exercise requires — no more, no less.
- The output of the rule is a complete, correctly-typed set record for that exercise.
- The user encounters this rule every time they log a set: the data entry fields change per exercise type, invisibly enforcing completeness.

No existing domain logic is changed — the existing authentication service has no domain logic beyond credential validation.

---

## Access Control Changes

No auth model change — the current model is preserved as-is.

**Current model (preserved):**

- Authentication: email + password with token-based session management
- Role model: two roles — **regular user** and **admin**
- Regular user: accesses the web app; owns their own workout data (sessions and workout sets)
- Admin: accesses the admin app; admin capabilities are not yet defined — see Open Questions

**What must not break:** The authentication service's API contracts (register, login, logout, session validation) must remain unchanged.

---

## Non-Goals

- **No custom exercises (user-created):** The exercise library is predefined-only in v1. Users cannot add their own exercises. Rationale: scope discipline for MVP; custom exercises add complexity to the metrics model.
- **No social features:** No workout sharing, friends, leaderboards, or competitive challenges. This is a single-user product in v1.
- **No native mobile app:** Web-first only — mobile experience is delivered via a responsive web app, not via app store distribution.
- **No AI recommendations or smart suggestions:** No algorithmic workout recommendations, no "what to do next" intelligence.
- **No workout templates:** Users cannot save or reuse workout templates in v1. Each session is started fresh.
- **No nutrition tracking:** Out of scope entirely.
- **No advanced analytics or charts:** No trend graphs, no volume analysis, no visual progress charts. Basic stats (total workouts, recent activity) are the ceiling for v1.
- **No GDPR compliance tooling:** Deferred beyond v1.

---

## Open Questions

1. **What can the admin role do?** The admin app is out of scope for MVP — deferred. Resolve before admin-app features are built.

2. ~~**How will new data tables be introduced into the existing system?**~~ **Resolved:** New workout-related data tables will live in new, dedicated services (separate from the existing authentication service).
