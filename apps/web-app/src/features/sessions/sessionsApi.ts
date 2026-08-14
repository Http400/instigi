import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  AddSessionExerciseRequest,
  ApiResponse,
  CreateSessionRequest,
  ExerciseEntry,
  ExerciseEntryValues,
  SessionExercise,
  SessionSummary,
  UpdateSessionRequest,
  WorkoutSession,
} from '@instigi/types';
import { createBaseQueryWithReauth } from '../api/baseQuery';
import { SESSIONS_API } from '../api/config';

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

interface LogSetArgs {
  sessionId: string;
  sessionExerciseId: string;
  values: ExerciseEntryValues;
}

interface UpdateSetArgs {
  sessionId: string;
  sessionExerciseId: string;
  entryId: string;
  values: ExerciseEntryValues;
}

interface DeleteSetArgs {
  sessionId: string;
  sessionExerciseId: string;
  entryId: string;
}

interface FinishSessionArgs {
  id: string;
}

interface DiscardSessionArgs {
  id: string;
}

export type {
  UpdateSessionArgs,
  AddSessionExerciseArgs,
  RemoveSessionExerciseArgs,
  LogSetArgs,
  UpdateSetArgs,
  DeleteSetArgs,
  FinishSessionArgs,
  DiscardSessionArgs,
};

export const sessionsApi = createApi({
  reducerPath: 'sessionsApi',
  baseQuery: createBaseQueryWithReauth(SESSIONS_API),
  tagTypes: ['ActiveSession', 'Session', 'History'],
  endpoints: (builder) => ({
    getActiveSession: builder.query<WorkoutSession | null, void>({
      query: () => ({ url: '/active' }),
      transformResponse: (response: ApiResponse<WorkoutSession | null>) =>
        response.data,
      providesTags: ['ActiveSession'],
    }),
    getHistory: builder.query<SessionSummary[], void>({
      query: () => ({ url: '/history' }),
      transformResponse: (response: ApiResponse<SessionSummary[]>) =>
        response.data,
      providesTags: ['History'],
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
    logSet: builder.mutation<ExerciseEntry, LogSetArgs>({
      query: ({ sessionId, sessionExerciseId, values }) => ({
        url: `/${sessionId}/exercises/${sessionExerciseId}/sets`,
        method: 'POST',
        body: { values },
      }),
      transformResponse: (response: ApiResponse<ExerciseEntry>) =>
        response.data,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        'ActiveSession',
      ],
    }),
    updateSet: builder.mutation<ExerciseEntry, UpdateSetArgs>({
      query: ({ sessionId, sessionExerciseId, entryId, values }) => ({
        url: `/${sessionId}/exercises/${sessionExerciseId}/sets/${entryId}`,
        method: 'PATCH',
        body: { values },
      }),
      transformResponse: (response: ApiResponse<ExerciseEntry>) =>
        response.data,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        'ActiveSession',
      ],
    }),
    deleteSet: builder.mutation<{ id: string }, DeleteSetArgs>({
      query: ({ sessionId, sessionExerciseId, entryId }) => ({
        url: `/${sessionId}/exercises/${sessionExerciseId}/sets/${entryId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<{ id: string }>) =>
        response.data,
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        'ActiveSession',
      ],
    }),
    finishSession: builder.mutation<WorkoutSession, FinishSessionArgs>({
      query: ({ id }) => ({ url: `/${id}/finish`, method: 'POST' }),
      transformResponse: (response: ApiResponse<WorkoutSession>) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Session', id },
        'ActiveSession',
        'History',
      ],
    }),
    discardSession: builder.mutation<{ id: string }, DiscardSessionArgs>({
      query: ({ id }) => ({ url: `/${id}`, method: 'DELETE' }),
      transformResponse: (response: ApiResponse<{ id: string }>) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Session', id },
        'ActiveSession',
      ],
    }),
  }),
});

export const {
  useGetActiveSessionQuery,
  useGetHistoryQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useAddSessionExerciseMutation,
  useRemoveSessionExerciseMutation,
  useLogSetMutation,
  useUpdateSetMutation,
  useDeleteSetMutation,
  useFinishSessionMutation,
  useDiscardSessionMutation,
} = sessionsApi;
