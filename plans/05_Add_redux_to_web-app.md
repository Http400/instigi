# 05_Add_redux_to_web-app

## Problem

`web-app` has no global state management. `AuthPage` wires up nothing — the `onSubmit` handler is a console.log placeholder. We need:

- Redux + Redux Toolkit installed in `web-app`
- RTK Query `authApi` for login / register / refresh HTTP calls
- A typed `authSlice` storing `user`, `accessToken`, `refreshToken`, `isAuthenticated`
- Tokens persisted in `localStorage`, re-hydrated on boot
- Silent token refresh: a custom RTK Query `baseQuery` that retries once on 401 using the refresh token; falls back to logout if refresh fails
- `AuthPage` wired up to the real RTK Query hooks
- `RootLayout` updated to show the user's name + Sign Out when authenticated
- The `AuthForm` in `@instigi/ui` extended with a `name` field for sign-up mode

## Decisions

| Topic                | Choice                                                    |
| -------------------- | --------------------------------------------------------- |
| Token storage        | `localStorage`                                            |
| API layer            | RTK Query                                                 |
| 401 handling         | Silent retry via custom `baseQuery` with reauthentication |
| Sign-up `name` field | Add to `AuthForm` in `@instigi/ui`                        |

## API Contract (auth-service)

| Method | Path                 | Body                        | Response                     |
| ------ | -------------------- | --------------------------- | ---------------------------- |
| POST   | `/api/auth/login`    | `{ email, password }`       | `{ data: { user, tokens } }` |
| POST   | `/api/auth/register` | `{ email, name, password }` | `{ data: { user, tokens } }` |
| POST   | `/api/auth/refresh`  | `{ refreshToken }`          | `{ data: { tokens } }`       |

Access token expires in **15 min**; refresh token expires in **7 days**.

## Folder Structure (web-app/src additions)

```
src/
  store/
    index.ts          ← configureStore, RootState, AppDispatch exports
    hooks.ts          ← useAppDispatch / useAppSelector typed hooks
  features/
    auth/
      authApi.ts      ← RTK Query createApi: login, register endpoints
      authSlice.ts    ← state: { user, accessToken, refreshToken, isAuthenticated }
                         reducers: setCredentials, logout
      authSelectors.ts ← selectCurrentUser, selectIsAuthenticated, selectAccessToken
      baseQuery.ts    ← fetchBaseQuery wrapper with 401-triggered silent refresh
```

## Implementation Steps

### 1. Extend `@instigi/ui` AuthForm with `name` field (sign-up only)

- Add `name` to `AuthFormData` interface (`name?: string` — optional so sign-in callers are unaffected)
- Render a "Name" text field between email and password when `mode === 'signUp'`
- Add required validation for `name` in sign-up mode
- Update `AuthForm.stories.tsx` for sign-up story

### 2. Install dependencies in web-app

```bash
pnpm add @reduxjs/toolkit react-redux --filter @instigi/web-app
```

### 3. Create `src/store/index.ts`

- `configureStore` with `authApi.reducer` and `authSlice.reducer`
- Add `authApi.middleware`
- Export `RootState` and `AppDispatch` types

### 4. Create `src/store/hooks.ts`

- `useAppDispatch` and `useAppSelector` typed wrappers

### 5. Create `src/features/auth/baseQuery.ts`

- Wrap `fetchBaseQuery` with the auth-service base URL (`http://localhost:4000`)
- On 401 response: call `POST /api/auth/refresh` with the stored refresh token
- If refresh succeeds: store new tokens via `dispatch(setCredentials(...))`, retry original request
- If refresh fails or no refresh token: dispatch `logout()` (clears store + localStorage)

### 6. Create `src/features/auth/authSlice.ts`

- Initial state loaded from `localStorage` (`user`, `accessToken`, `refreshToken`)
- Reducers:
  - `setCredentials(state, action: { user, tokens })` — stores in state and syncs to localStorage
  - `logout(state)` — clears state and removes from localStorage

### 7. Create `src/features/auth/authSelectors.ts`

- `selectCurrentUser(state)`
- `selectIsAuthenticated(state)`
- `selectAccessToken(state)`

### 8. Create `src/features/auth/authApi.ts`

- `createApi` with `baseQuery` from step 5
- `login` mutation: `POST /api/auth/login`
- `register` mutation: `POST /api/auth/register`
- `onQueryStarted` for login + register: dispatch `setCredentials` on success

### 9. Wire up Provider in `src/main.tsx`

- Wrap `<RouterProvider>` with `<Provider store={store}>`

### 10. Update `src/pages/AuthPage.tsx`

- Use `useLoginMutation` / `useRegisterMutation` from `authApi`
- Pass `loading` and `error` props to `<AuthForm>`
- On success navigate to `/` via `useNavigate`

### 11. Update `src/layouts/RootLayout.tsx`

- Use `selectIsAuthenticated` and `selectCurrentUser`
- If authenticated: show `"Hello, {name}"` + Sign Out button (dispatches `logout()`)
- If not authenticated: show existing "Sign In / Sign Up" button

### 12. Add tests

- `authSlice.test.ts` — setCredentials, logout reducers; localStorage sync
- `AuthPage.test.tsx` — renders form, dispatches login on submit, shows error on failure

## Out of Scope (this plan)

- Refresh token rotation on the backend
- Protected routes / route guards
- Remember-me / session expiry UX
