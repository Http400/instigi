import {
  createApi,
} from '@reduxjs/toolkit/query/react';
import type {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  LoginResponse,
} from '@instigi/types';
import { createBaseQueryWithReauth } from '../api/baseQuery';

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export type { RegisterRequest };

interface RefreshResponse {
  tokens: AuthTokens;
}

export type { RefreshResponse };

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQueryWithReauth(`${API_BASE}/api/auth`),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      transformResponse: (response: ApiResponse<LoginResponse>) =>
        response.data,
    }),
    register: builder.mutation<LoginResponse, RegisterRequest>({
      query: (body) => ({ url: '/register', method: 'POST', body }),
      transformResponse: (response: ApiResponse<LoginResponse>) =>
        response.data,
    }),
    refresh: builder.mutation<RefreshResponse, { refreshToken: string }>({
      query: (body) => ({ url: '/refresh', method: 'POST', body }),
      transformResponse: (response: ApiResponse<RefreshResponse>) =>
        response.data,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshMutation } =
  authApi;
