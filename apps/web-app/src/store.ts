import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './features/auth/authSlice';
import { authApi } from './features/auth/authApi';
import { exercisesApi } from './features/exercises/exercisesApi';
import { sessionsApi } from './features/sessions/sessionsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [exercisesApi.reducerPath]: exercisesApi.reducer,
    [sessionsApi.reducerPath]: sessionsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      exercisesApi.middleware,
      sessionsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
