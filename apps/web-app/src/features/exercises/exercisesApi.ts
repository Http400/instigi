import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiResponse, Exercise, ExerciseCategory } from '@instigi/types';
import { createBaseQueryWithReauth } from '../api/baseQuery';
import { EXERCISES_API } from '../api/config';

interface ListExercisesParams {
  search?: string;
  category?: ExerciseCategory;
}

export type { ListExercisesParams };

export const exercisesApi = createApi({
  reducerPath: 'exercisesApi',
  baseQuery: createBaseQueryWithReauth(EXERCISES_API),
  endpoints: (builder) => ({
    listExercises: builder.query<Exercise[], ListExercisesParams | void>({
      query: (params) => ({ url: '', params: params ?? {} }),
      transformResponse: (response: ApiResponse<Exercise[]>) => response.data,
    }),
  }),
});

export const { useListExercisesQuery } = exercisesApi;
