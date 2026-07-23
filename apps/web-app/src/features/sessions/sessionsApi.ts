import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  AddSessionExerciseRequest,
  ApiResponse,
  CreateSessionRequest,
  SessionExercise,
  UpdateSessionRequest,
  WorkoutSession,
} from '@instigi/types';
import { createBaseQueryWithReauth } from '../api/baseQuery';

const TRAINING_API_BASE =
  import.meta.env.VITE_TRAINING_API_URL ?? 'http://localhost:4001';

interface UpdateSessionArgs extends UpdateSessionRequest {
  id: string;
}

interface AddSessionExerciseArgs extends AddSessionExerciseRequest {
  sessionId: string;
}

interface RemoveSessionExerciseArgs {
  sessionId: string;
  sessionExerciseId: string;
}

export type {
  UpdateSessionArgs,
  AddSessionExerciseArgs,
  RemoveSessionExerciseArgs,
};

export const sessionsApi = createApi({
  reducerPath: 'sessionsApi',
  baseQuery: createBaseQueryWithReauth(`${TRAINING_API_BASE}/api/sessions`),
  tagTypes: ['ActiveSession', 'Session'],
  endpoints: (builder) => ({
    getActiveSession: builder.query<WorkoutSession | null, void>({
      query: () => ({ url: '/active' }),
      transformResponse: (response: ApiResponse<WorkoutSession | null>) =>
        response.data,
      providesTags: ['ActiveSession'],
    }),
    getSession: builder.query<WorkoutSession, string>({
      query: (id) => ({ url: `/${id}` }),
      transformResponse: (response: ApiResponse<WorkoutSession>) =>
        response.data,
      providesTags: (_result, _error, id) => [{ type: 'Session', id }],
    }),
    createSession: builder.mutation<WorkoutSession, CreateSessionRequest>({
      query: (body) => ({ url: '', method: 'POST', body }),
      transformResponse: (response: ApiResponse<WorkoutSession>) =>
        response.data,
      invalidatesTags: ['ActiveSession'],
    }),
    updateSession: builder.mutation<WorkoutSession, UpdateSessionArgs>({
      query: ({ id, title }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: { title },
      }),
      transformResponse: (response: ApiResponse<WorkoutSession>) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Session', id },
        'ActiveSession',
      ],
    }),
    addSessionExercise: builder.mutation<
      SessionExercise,
      AddSessionExerciseArgs
    >({
      query: ({ sessionId, exerciseDefinitionId }) => ({
        url: `/${sessionId}/exercises`,
        method: 'POST',
        body: { exerciseDefinitionId },
      }),
      transformResponse: (response: ApiResponse<SessionExercise>) =>
        response.data,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        'ActiveSession',
      ],
    }),
    removeSessionExercise: builder.mutation<
      { id: string },
      RemoveSessionExerciseArgs
    >({
      query: ({ sessionId, sessionExerciseId }) => ({
        url: `/${sessionId}/exercises/${sessionExerciseId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<{ id: string }>) =>
        response.data,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        'ActiveSession',
      ],
    }),
  }),
});

export const {
  useGetActiveSessionQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useAddSessionExerciseMutation,
  useRemoveSessionExerciseMutation,
} = sessionsApi;
