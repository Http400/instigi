# User Stories

## Epic 1: Authentication

### US-001: Register an account
**As a** new user
**I want to** create an account with email and password
**So that** my workout data is saved and accessible across sessions

**Acceptance Criteria**:
- [ ] Given I am on the registration page, when I submit a valid email and password (min 8 chars), then my account is created and I am logged in
- [ ] Given I submit an email already in use, when I submit the form, then I see an error: "Email already registered"
- [ ] Given I submit a password shorter than 8 characters, when I submit the form, then I see a validation error before the request is sent
- [ ] Given registration succeeds, then my password is never stored in plain text

**Priority**: P0
**Estimate**: S

---

### US-002: Log in to my account
**As a** registered user
**I want to** log in with email and password
**So that** I can access my personal workout data

**Acceptance Criteria**:
- [ ] Given valid credentials, when I submit the login form, then I am authenticated and redirected to the dashboard
- [ ] Given invalid credentials, when I submit the login form, then I see an error: "Invalid email or password" (no credential enumeration)
- [ ] Given a successful login, then a secure session token is issued and stored client-side
- [ ] Given I close the browser and reopen the app, then I remain logged in until I explicitly log out

**Priority**: P0
**Estimate**: S

---

### US-003: Log out
**As a** logged-in user
**I want to** log out of my account
**So that** my account is protected on shared devices

**Acceptance Criteria**:
- [ ] Given I click logout, then my session token is invalidated and I am redirected to the login page
- [ ] Given I log out, when I navigate back, then I cannot access protected pages

**Priority**: P0
**Estimate**: XS

---

## Epic 2: Workout Logging

### US-004: Start a workout session
**As a** logged-in user
**I want to** start a new workout session
**So that** I can record the exercises I perform

**Acceptance Criteria**:
- [ ] Given I am on the dashboard, when I tap "Start Workout", then a new session is created with the current timestamp
- [ ] Given a session is active, then I can give it a name (optional, defaults to today's date)
- [ ] Given I close the app mid-workout, when I reopen it, then the active session is still available to continue

**Priority**: P0
**Estimate**: S

---

### US-005: Add an exercise to a workout
**As a** logged-in user in an active workout session
**I want to** add exercises to my workout
**So that** I can track what I performed

**Acceptance Criteria**:
- [ ] Given an active session, when I search and select an exercise, then it is added to the current workout
- [ ] Given I add an exercise, then I can add multiple exercises in sequence
- [ ] Given I add the same exercise twice, then it appears as a separate block in the workout

**Priority**: P0
**Estimate**: S

---

### US-006: Log sets, reps, and weight
**As a** logged-in user
**I want to** log sets with reps and weight for each exercise
**So that** I can track the exact volume I performed

**Acceptance Criteria**:
- [ ] Given an exercise in my workout, when I add a set, then I can enter reps, weight (kg), and optionally duration
- [ ] Given I add a set, then I can add additional sets to the same exercise
- [ ] Given I enter a set, then reps and weight are optional (to support bodyweight or cardio exercises)
- [ ] Given I made a mistake, when I tap a set, then I can edit or delete it

**Priority**: P0
**Estimate**: M

---

### US-007: Complete and save a workout session
**As a** logged-in user
**I want to** finish and save my workout
**So that** it appears in my history

**Acceptance Criteria**:
- [ ] Given an active session, when I tap "Finish Workout", then the session is saved with a completedAt timestamp
- [ ] Given I finish a workout, then it immediately appears in my workout history
- [ ] Given I finish a workout with no exercises, then I see a warning prompt before saving
- [ ] Given I want to discard a session, then I can delete it without it appearing in history

**Priority**: P0
**Estimate**: S

---

## Epic 3: Exercise Management

### US-008: Browse predefined exercises
**As a** logged-in user
**I want to** browse a library of predefined exercises
**So that** I can quickly add common exercises without creating them manually

**Acceptance Criteria**:
- [ ] Given I open the exercise picker, then I see a searchable list of predefined exercises
- [ ] Given I type in the search box, then the list filters in real time
- [ ] Given I filter by muscle group, then only matching exercises are shown
- [ ] Given predefined exercises, then I cannot edit or delete them

**Priority**: P0
**Estimate**: S

---

### US-009: Add a custom exercise
**As a** logged-in user
**I want to** create my own custom exercises
**So that** I can track exercises not in the predefined library

**Acceptance Criteria**:
- [ ] Given I tap "Create exercise", when I enter a name, then the exercise is saved to my personal library
- [ ] Given a custom exercise, then only I can see and use it
- [ ] Given a duplicate name (case-insensitive), then I see a validation error
- [ ] Given I have created custom exercises, then they appear alongside predefined exercises in search

**Priority**: P1
**Estimate**: S

---

## Epic 4: Workout History & Progress

### US-010: View workout history
**As a** logged-in user
**I want to** see a list of my past workout sessions
**So that** I can review what I have done over time

**Acceptance Criteria**:
- [ ] Given I navigate to History, then I see a chronological list of completed workouts (newest first)
- [ ] Given each history entry, then I can see the date, workout name, and number of exercises
- [ ] Given I tap a workout, then I can see its full detail (exercises, sets, reps, weights)
- [ ] Given I have no completed workouts, then I see an empty state prompt to start a workout

**Priority**: P0
**Estimate**: S

---

### US-011: View workout details
**As a** logged-in user
**I want to** see the full breakdown of a past workout
**So that** I can reference what I did and at what weights

**Acceptance Criteria**:
- [ ] Given I open a past workout, then I see all exercises with their sets, reps, and weights
- [ ] Given I view a past workout, then I can see the duration (completedAt - startedAt)
- [ ] Given I view a past workout, then I can see any notes I recorded

**Priority**: P0
**Estimate**: XS

---

### US-012: View progress dashboard
**As a** logged-in user
**I want to** see basic stats about my training
**So that** I can track consistency and overall volume at a glance

**Acceptance Criteria**:
- [ ] Given I open the dashboard, then I see total workouts completed (all-time)
- [ ] Given I open the dashboard, then I see my most recent workout date
- [ ] Given I open the dashboard, then I see per-exercise "last weight used" for my top exercises
- [ ] Given I open the dashboard, then I see workouts completed this week and this month
- [ ] Given I have no workout data yet, then the dashboard shows empty states with prompts to start

**Priority**: P1
**Estimate**: M
