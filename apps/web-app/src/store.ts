import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './features/auth/authSlice';
import { authApi } from './features/auth/authApi';
import { exercisesApi } from './features/exercises/exercisesApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [exercisesApi.reducerPath]: exercisesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, exercisesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
