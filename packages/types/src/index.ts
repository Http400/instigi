// Shared user types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'user' | 'guest';

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Exercise domain types
export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'custom';

export type MetricKey = 'reps' | 'load' | 'distance' | 'duration';

export type EntryType = 'set' | 'single' | 'lap' | 'interval';

export interface ExerciseMetric {
  key: MetricKey;
  required?: boolean;
}

/** Browse-facing exercise DTO. Never exposes the owning userId. */
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  metrics: ExerciseMetric[];
  allowedEntryTypes: EntryType[];
  defaultEntryType: EntryType;
  /** True when this is a global predefined exercise (userId === null). */
  isPredefined: boolean;
}

// Workout session domain types

/**
 * An exercise added to a workout session. Definition fields are snapshotted at
 * add-time, so a later edit or archive of the source definition can't rewrite
 * session history. `exerciseDefinitionId` is a soft reference (no DB FK).
 */
export interface SessionExercise {
  id: string;
  sessionId: string;
  /** Soft reference to the source definition; null if the definition is gone. */
  exerciseDefinitionId: string | null;
  name: string;
  category: ExerciseCategory;
  metrics: ExerciseMetric[];
  allowedEntryTypes: EntryType[];
  defaultEntryType: EntryType;
  position: number;
}

/**
 * A workout session. Timestamps cross the wire as ISO strings (not Date) so the
 * RTK Query cache stays serializable.
 */
export interface WorkoutSession {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  exercises: SessionExercise[];
}

export interface CreateSessionRequest {
  title?: string;
}

export interface UpdateSessionRequest {
  title: string;
}

export interface AddSessionExerciseRequest {
  exerciseDefinitionId: string;
}
