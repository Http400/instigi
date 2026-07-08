import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  LoginResponse,
} from '@instigi/types';
import { credentialsReceived, loggedOut, tokensRefreshed } from './authSlice';

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

/** Minimal shape of the store state this baseQuery needs to read. */
interface AuthRootStateSlice {
  auth: {
    accessToken: string | null;
    refreshToken: string | null;
  };
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE}/api/auth`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthRootStateSlice).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Module-level mutex: concurrent 401s await a single in-flight refresh.
let refreshPromise: Promise<AuthTokens | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const endpoint = api.endpoint;
  let result = await rawBaseQuery(args, api, extraOptions);

  const isAuthEntryPoint = endpoint === 'login' || endpoint === 'register';

  if (result.error?.status === 401 && !isAuthEntryPoint) {
    if (!refreshPromise) {
      refreshPromise = (async (): Promise<AuthTokens | null> => {
        const refreshToken = (api.getState() as AuthRootStateSlice).auth
          .refreshToken;
        if (!refreshToken) return null;
        const refreshResult = await rawBaseQuery(
          {
            url: '/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );
        const payload = refreshResult.data as
          | ApiResponse<RefreshResponse>
          | undefined;
        return payload?.data.tokens ?? null;
      })();
    }

    let tokens: AuthTokens | null;
    try {
      tokens = await refreshPromise;
    } finally {
      refreshPromise = null;
    }

    if (tokens) {
      api.dispatch(tokensRefreshed(tokens));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(loggedOut());
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      transformResponse: (response: ApiResponse<LoginResponse>) =>
        response.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsReceived({ user: data.user, tokens: data.tokens }));
        } catch {
          // Error surfaced to the caller via the mutation result.
        }
      },
    }),
    register: builder.mutation<LoginResponse, RegisterRequest>({
      query: (body) => ({ url: '/register', method: 'POST', body }),
      transformResponse: (response: ApiResponse<LoginResponse>) =>
        response.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsReceived({ user: data.user, tokens: data.tokens }));
        } catch {
          // Error surfaced to the caller via the mutation result.
        }
      },
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
