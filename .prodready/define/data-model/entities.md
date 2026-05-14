# Data Model

## Entities

### User
- id: UUID (PK)
- email: String (unique)
- passwordHash: String
- createdAt: DateTime
- updatedAt: DateTime

### WorkoutSession
- id: UUID (PK)
- userId: UUID (FK → User)
- name: String (optional, defaults to date)
- startedAt: DateTime
- completedAt: DateTime (nullable — null means session is active)
- notes: String (optional)
- createdAt: DateTime
- updatedAt: DateTime

### Exercise
- id: UUID (PK)
- name: String
- muscleGroup: String (optional — e.g. "Chest", "Back", "Legs")
- isCustom: Boolean (false = predefined/system, true = user-created)
- userId: UUID (nullable FK → User — null for predefined exercises)
- createdAt: DateTime

### WorkoutExercise
- id: UUID (PK)
- workoutSessionId: UUID (FK → WorkoutSession)
- exerciseId: UUID (FK → Exercise)
- order: Int (display order within the session)
- notes: String (optional)

### ExerciseSet
- id: UUID (PK)
- workoutExerciseId: UUID (FK → WorkoutExercise)
- setNumber: Int
- reps: Int (optional — null for time-based exercises)
- weightKg: Float (optional — null for bodyweight exercises)
- durationSec: Int (optional — for cardio/timed exercises)
- completedAt: DateTime

## Relationships
- User 1:N WorkoutSession
- User 1:N Exercise (custom exercises only; predefined have userId = null)
- WorkoutSession 1:N WorkoutExercise
- Exercise 1:N WorkoutExercise
- WorkoutExercise 1:N ExerciseSet

## Indexes
- User.email (unique)
- WorkoutSession.userId (for listing user's sessions)
- WorkoutSession.completedAt (for history ordering)
- WorkoutExercise.(workoutSessionId, order) (for ordered display)
- Exercise.name + userId (unique constraint to prevent duplicate custom exercise names per user)
