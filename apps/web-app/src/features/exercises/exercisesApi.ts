import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiResponse, Exercise, ExerciseCategory } from '@instigi/types';
import { createBaseQueryWithReauth } from '../api/baseQuery';

const TRAINING_API_BASE =
  import.meta.env.VITE_TRAINING_API_URL ?? 'http://localhost:4001';

interface ListExercisesParams {
  search?: string;
  category?: ExerciseCategory;
}

export type { ListExercisesParams };

export const exercisesApi = createApi({
  reducerPath: 'exercisesApi',
  baseQuery: createBaseQueryWithReauth(`${TRAINING_API_BASE}/api/exercises`),
  endpoints: (builder) => ({
    listExercises: builder.query<Exercise[], ListExercisesParams | void>({
      query: (params) => ({ url: '', params: params ?? {} }),
      transformResponse: (response: ApiResponse<Exercise[]>) => response.data,
    }),
  }),
});

export const { useListExercisesQuery } = exercisesApi;
