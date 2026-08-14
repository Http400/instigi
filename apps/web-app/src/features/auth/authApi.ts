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
import { AUTH_API } from '../api/config';

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

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQueryWithReauth(AUTH_API),
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
