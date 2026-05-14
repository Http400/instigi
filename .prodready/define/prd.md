# Product Requirements Document (PRD)

## 1. Executive Summary

**Product**: Instigi (Workout Tracker)
**Problem**: Fitness enthusiasts struggle to stay consistent because tracking workouts manually is slow and disorganized, while existing apps are bloated, rigid, or distracting.
**Solution**: A focused, mobile-first web app that lets users log workout sessions quickly — exercises, sets, reps, and weights — and review history and basic progress stats with minimal friction.
**Target Users**: Gym-goers and fitness enthusiasts of any level who want a fast, clean tracking experience on mobile.
**Success Metric**: User Retention Rate (primary), DAU, MAU.

---

## 2. Goals & Non-Goals

### Goals
- Allow users to log a complete workout session in under 2 minutes of interaction
- Provide a clear record of past workouts and per-exercise progress (last weights used, session counts)
- Deliver a mobile-optimized experience that is fast and distraction-free
- Ship a working MVP in 1 week (solo developer)

### Non-Goals
- No AI recommendations, social features, wearable integrations, nutrition tracking
- No paid subscriptions or ads at launch
- No trainer marketplace, gamification systems, or video content
- No GDPR compliance tooling in v1.0 (deferred to v1.1)

---

## 3. User Personas

### Persona 1: Gym Regular (Beginner–Intermediate)
- **Context**: Goes to the gym 3–4x/week; currently tracks workouts on paper or not at all
- **Pain Point**: Loses track of weights used, can't see progress, paper notes get lost
- **Desired Outcome**: A fast way to log each set as they go and look back at previous sessions for reference

### Persona 2: Self-Coached Athlete (Intermediate–Advanced)
- **Context**: Follows a structured self-written program; tracks progressive overload carefully
- **Pain Point**: Spreadsheets are cumbersome on a phone mid-workout
- **Desired Outcome**: An app that records sets/reps/weights quickly and shows last session's weights per exercise

---

## 4. Functional Requirements

### FR-1: Authentication
- Users can register with email + password (min 8 characters)
- Users can log in and log out securely
- Sessions persist across browser reloads (JWT-based)
- **Acceptance**: Duplicate email rejected; invalid credentials give a generic error; logout invalidates session

### FR-2: Workout Logging
- Users can start a new named workout session (defaults to current date)
- Users can add exercises to an active session from a searchable list
- For each exercise, users can log multiple sets with reps, weight (kg), and optional duration
- Sets can be edited or deleted; sessions can be discarded
- **Acceptance**: Empty workout warns before saving; session persists if app is closed mid-workout

### FR-3: Exercise Library
- A predefined library of common exercises (with muscle group tags) is available to all users
- Users can add personal custom exercises (name + optional muscle group)
- Custom exercises are private; duplicates (case-insensitive) are rejected
- **Acceptance**: Real-time search; muscle group filter; predefined exercises are read-only

### FR-4: Workout History
- Completed workouts appear in a reverse-chronological list showing date, name, and exercise count
- Tapping a workout shows full detail: exercises, sets, reps, weights, total duration
- Empty state shown when no workouts exist

### FR-5: Progress Dashboard
- At-a-glance stats: total workouts completed, most recent workout date, workouts this week/month
- Per-exercise "last weight used" for the user's most-logged exercises
- No charts or trend graphs in v1.0

---

## 5. Non-Functional Requirements

- **Performance**: Core actions (open app, log a set, save session) must feel fast on mobile (target < 300 ms UI response)
- **Security**: HTTPS, bcrypt/argon2 password hashing, JWT session management
- **Availability**: VPS-hosted via Docker; no SLA requirement for v1.0
- **Budget**: Infrastructure ≤ $20/month
- **Scale**: Up to 100 concurrent users at launch; no high-availability requirement

---

## 6. Data Model Summary

### Entities
- **User**: Account credentials; owns workout sessions and custom exercises
- **WorkoutSession**: A single training session with a name, start/end timestamps, and optional notes
- **Exercise**: A named exercise (predefined or user-created) with an optional muscle group tag
- **WorkoutExercise**: Links an exercise to a session in ordered position
- **ExerciseSet**: A single set within a workout exercise — reps, weight (kg), optional duration

### Key Relationships
- User → WorkoutSession: one user has many sessions
- User → Exercise: one user has many custom exercises (predefined exercises have no owner)
- WorkoutSession → WorkoutExercise → ExerciseSet: hierarchical — session contains ordered exercises, each with multiple sets

---

## 7. Scope & Timeline

- **MVP Features**: Authentication, Workout Logging, Exercise Library (predefined + custom), Workout History, Progress Dashboard (simple stats), mobile-first UI
- **Future Features**: Workout templates, advanced analytics (charts/trends), social features, gamification, wearable integrations, AI recommendations, nutrition tracking, offline mode, coaching tools, push notifications
- **Timeline**: 1 week
- **Team**: Solo developer (TypeScript full-stack)
- **Stack**: Vite + React + TypeScript + Material UI + Redux (frontend); Node.js + Express + TypeScript + Prisma (backend); PostgreSQL; Docker on VPS

---

## 8. Open Questions & Risks

- **Risk**: 1-week timeline is aggressive for a full-stack authenticated CRUD app — scope should be defended rigorously (no feature additions mid-week)
- **Risk**: Exercise seeding — predefined exercise library needs to be populated; scope of seed data (how many exercises?) should be decided at implementation time to avoid time sink
- **Open Question**: Should active (in-progress) workouts be persisted server-side or just in local/session storage for simplicity? Server-side is more reliable but adds implementation complexity for MVP.

---

## 9. References

- Detailed user stories: `requirements/user-stories.md`
- Data model: `data-model/entities.md`
- Schema: `data-model/schema.prisma`
- Test scenarios: `test-scenarios/*.feature`
- Constraints: `constraints.md`
- Constitution: `constitution.md`
