import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { ApiResponse, AuthTokens } from '@instigi/types';
import { loggedOut, tokensRefreshed } from '../auth/authSlice';

/** Minimal shape of the store state this baseQuery needs to read. */
interface AuthRootStateSlice {
  auth: {
    accessToken: string | null;
    refreshToken: string | null;
  };
}

interface RefreshResponse {
  tokens: AuthTokens;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// Refresh always targets the auth-service, regardless of the resource base URL
// the caller is querying.
const refreshBaseQuery = fetchBaseQuery({ baseUrl: `${API_BASE}/api/auth` });

// Module-level mutex shared across every API built by this factory: concurrent
// 401s (even across different APIs) serialize on a single in-flight refresh.
let refreshPromise: Promise<AuthTokens | null> | null = null;

/**
 * Build a base query that injects the access token, and on a 401 transparently
 * refreshes against the auth-service and retries once. `baseUrl` is the resource
 * root (e.g. the auth or training service); refresh always hits the auth-service.
 */
export function createBaseQueryWithReauth(
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as AuthRootStateSlice).auth.accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    const endpoint = api.endpoint;
    let result = await rawBaseQuery(args, api, extraOptions);

    // login/register 401s mean bad credentials, not an expired token.
    const isAuthEntryPoint = endpoint === 'login' || endpoint === 'register';

    if (result.error?.status === 401 && !isAuthEntryPoint) {
      if (!refreshPromise) {
        refreshPromise = (async (): Promise<AuthTokens | null> => {
          const refreshToken = (api.getState() as AuthRootStateSlice).auth
            .refreshToken;
          if (!refreshToken) return null;
          const refreshResult = await refreshBaseQuery(
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
}
