# Web-App Sign In / Sign Up Flow Implementation Plan

## Overview

Rebuild the web-app authentication experience by wiring the existing `AuthPage` shell to the already-built, **unchanged** auth-service (`POST /api/auth/login|register|refresh`) using **Redux Toolkit + RTK Query**. The result: a user can sign up, sign in, stay signed in across browser reloads (localStorage-persisted session), have their access token auto-refreshed on expiry, see friendly error messages, get redirected into the app on success, and sign out. A `ProtectedRoute` guard and a placeholder protected page establish the pattern the workout slices will reuse.

This is roadmap slice **S-08** (`web-app-auth-flow`), independent of the workout track.

## Current State Analysis

- **AuthPage is a stub** (`apps/web-app/src/pages/AuthPage.tsx`): it renders the shared `AuthForm` and `console.log`s on submit with a `// TODO: wire up authentication` comment. No API calls, no state.
- **RootLayout nav is static** (`apps/web-app/src/layouts/RootLayout.tsx`): always shows a "Sign In / Sign Up" button regardless of auth state; no Sign Out.
- **No Redux** in the web-app — `@reduxjs/toolkit` / `react-redux` are not dependencies. `main.tsx` renders `<RouterProvider>` with no store `<Provider>`.
- **No API base-URL config** — no `.env`, no vite proxy. `vite.config.ts` only sets dev port 3000.
- **The auth-service contract is fixed and clean** (`services/auth-service/src/controllers/auth.ts`, `routes/auth.ts`, `app.ts`), served at base `/api/auth` on port 4000:
  - `POST /api/auth/login` — body `{ email, password }` → `200 { data: { user, tokens } }`; `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.
  - `POST /api/auth/register` — body `{ email, name, password }` (password min 8, name min 1) → `201 { data: { user, tokens } }`; `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`.
  - `POST /api/auth/refresh` — body `{ refreshToken }` → `200 { data: { tokens } }`; `400 MISSING_TOKEN`, `401 INVALID_TOKEN`.
  - Error shape everywhere: `{ message, code, statusCode }`. **No `logout` endpoint** → logout is a client-side token discard.
  - `tokens` = `{ accessToken, refreshToken }`; access token lives 15m, refresh 7d (`services/auth-service/src/jwt.ts`).
- **Shared types already exist** (`packages/types/src/index.ts`): `User`, `UserRole` (`'admin' | 'user' | 'guest'`), `AuthTokens`, `LoginRequest`, `LoginResponse` (`{ user, tokens }`), `ApiResponse<T>` (`{ data, message? }`), `ApiError` (`{ message, code, statusCode }`). The API returns `role` lowercased, matching `UserRole`.
- **Shared AuthForm gap** (`packages/ui/src/components/AuthForm.tsx`): `AuthFormData` is `{ email, password }` only — no `name`. Register requires `name`. AuthForm already exposes `loading?` and `error?` props (renders a MUI `<Alert>`), and validates email/password/confirm-password internally.
- **Test pattern**: Vitest + Testing Library + jsdom, `MemoryRouter` for routing (`apps/web-app/src/App.test.tsx`, `vite.config.ts` test block, `src/test-setup.ts`).
- **tsconfig strictness** (`tsconfig.base.json`): `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — guard array access; do not assign `undefined` to optional props explicitly.

### Key Discoveries:

- API success envelope is `{ data: {...} }` and errors are `{ message, code, statusCode }` — RTK Query must unwrap `.data` in `transformResponse` and read the error body's `code` for message mapping (`services/auth-service/src/controllers/auth.ts:31-60`).
- `LoginResponse` in `@instigi/types` already matches both login and register success payloads (`packages/types/src/index.ts`).
- AuthForm already has `loading` + `error` props and an Alert — no new form component needed for error display (`packages/ui/src/components/AuthForm.tsx`).
- Refresh returns **only** `{ tokens }` (no `user`), so the 401-refresh path must preserve the existing `user` in state and swap tokens only.
- House rule: every `packages/ui` component has a `*.stories.tsx` alongside it — the name-field change must update `AuthForm.stories.tsx`.

## Desired End State

A pre-launch user visiting `http://localhost:3000/auth` can:
- Create an account (email, name, password, confirm password) → lands on `/` signed in.
- Log in (email, password) → lands on `/` signed in.
- Reload the browser and remain signed in (session rehydrated from localStorage).
- Continue working past 15 minutes without being bounced to login (access token silently refreshed on 401).
- See a friendly, specific message for wrong credentials, email-already-taken, validation errors, and network failures.
- See a signed-in app shell (name/email + **Sign Out**) instead of the "Sign In" button; Sign Out clears the session and returns to `/auth`.
- Be redirected to `/auth` if they hit a protected route while signed out (guard demonstrated by a placeholder protected page).

Verified by: `pnpm --filter @instigi/web-app typecheck && lint && test && build` all pass; manual walkthrough of the flows above against a locally running auth-service. Auth-service code is untouched.

## What We're NOT Doing

- **No auth-service changes** — no new endpoints (including no server-side logout), no contract/response changes, no cookie handling. (PRD guardrail.)
- **No httpOnly-cookie / in-memory token architecture** — tokens live in localStorage for this MVP; security hardening is deferred.
- **No "Remember me" or "Forgot password"** wiring — the AuthForm's existing checkbox/link stay decorative (out of scope; no backend support).
- **No workout/domain pages** — the placeholder protected page exists only to exercise the guard; real protected pages come with the workout slices.
- **No admin-app changes** — this slice is web-app only.
- **No role-based routing** — the guard checks "authenticated", not role (admin capabilities are an open PRD question).

## Implementation Approach

Build bottom-up: (1) stand up the Redux store, the RTK Query auth API, and the persisted auth slice — the foundation everything else consumes; (2) close the `name`-field gap in the shared `AuthForm`; (3) wire `AuthPage` to the mutations and make the app shell auth-aware with a route guard; (4) cover the load-bearing logic with tests. Phases 1 and 2 are independent; Phase 3 depends on both; Phase 4 depends on Phase 3.

State model: `authSlice` holds `{ user: User | null, accessToken: string | null, refreshToken: string | null, status }`. `isAuthenticated` is derived from `accessToken != null`. A tiny `authStorage` helper is the single reader/writer of the `localStorage` keys and is used by (a) the slice's initial state (rehydration on boot), (b) reducers that set/clear credentials, and (c) the baseQuery wrapper to read the current tokens.

## Critical Implementation Details

- **401-refresh race**: RTK Query fires mutations/queries concurrently; a naive refresh-on-401 can trigger multiple parallel `/refresh` calls. Use a module-level mutex (e.g. an in-flight refresh `Promise`) so concurrent 401s await a single refresh, then retry. On refresh failure, dispatch logout and do not loop. Do not attempt refresh for the `login`/`register` endpoints themselves (a 401 there is a real credential error, not an expired token).
- **Refresh preserves user**: `/refresh` returns only `{ tokens }` — the reducer that applies refreshed tokens must keep the existing `user`; only login/register set `user`.
- **`exactOptionalPropertyTypes`**: when building the auth slice state and RTK Query args, never assign `undefined` to an optional field explicitly — omit it. Guard `localStorage.getItem` results (they're `string | null`).
- **Provider ordering** (`main.tsx`): Redux `<Provider>` must wrap `<RouterProvider>` so route elements and the layout can use hooks/selectors.

## Phase 1: Redux store, auth API layer, and session persistence

### Overview

Add Redux Toolkit + RTK Query, create the store, the auth API slice (with 401 auto-refresh), the persisted auth slice, wire the `<Provider>`, and add base-URL config. No UI behavior changes yet.

### Changes Required:

#### 1. Dependencies

**File**: `apps/web-app/package.json`

**Intent**: Add the Redux Toolkit and React-Redux runtime dependencies the store needs.

**Contract**: Add `@reduxjs/toolkit` and `react-redux` to `dependencies`. Install via `pnpm --filter @instigi/web-app add @reduxjs/toolkit react-redux` (use the ecosystem tool, not a hand-edit).

#### 2. Base-URL configuration

**File**: `apps/web-app/.env.example` (new), and read in the API slice

**Intent**: Make the auth-service base URL configurable per environment, defaulting to the local dev port.

**Contract**: `.env.example` documents `VITE_API_URL=http://localhost:4000`. The API slice reads `import.meta.env.VITE_API_URL ?? 'http://localhost:4000'` and appends `/api/auth`.

#### 3. Token storage helper

**File**: `apps/web-app/src/features/auth/authStorage.ts` (new)

**Intent**: Single choke point for reading/writing/clearing the persisted session in `localStorage`, so persistence logic isn't scattered.

**Contract**: Exports `loadSession(): { user, accessToken, refreshToken } | null`, `saveSession(session)`, `clearSession()`. Uses stable keys (e.g. `instigi.auth`). `loadSession` returns `null` on missing/corrupt JSON (wrap `JSON.parse` in try/catch; guard the `null` from `getItem`).

#### 4. Auth slice

**File**: `apps/web-app/src/features/auth/authSlice.ts` (new)

**Intent**: Hold auth state, derive authenticated status, and keep `localStorage` in sync; rehydrate from storage on boot.

**Contract**: State `{ user: User | null; accessToken: string | null; refreshToken: string | null; status: 'idle' | 'loading' }`. `initialState` seeds from `loadSession()`. Reducers: `credentialsReceived(state, { user, tokens })` (login/register — sets user + both tokens, calls `saveSession`), `tokensRefreshed(state, tokens)` (swaps tokens only, preserves user, calls `saveSession`), `loggedOut(state)` (clears all + `clearSession`). Export a `selectIsAuthenticated` selector (`accessToken != null`) and `selectCurrentUser`. Import `User`/`AuthTokens` from `@instigi/types`.

#### 5. RTK Query auth API with refresh-on-401 baseQuery

**File**: `apps/web-app/src/features/auth/authApi.ts` (new)

**Intent**: Define `login`/`register`/`refresh` mutations against the auth-service, unwrap the `{ data }` envelope, and transparently refresh the access token on 401.

**Contract**: `createApi` with `reducerPath: 'authApi'`. A `baseQueryWithReauth` wraps `fetchBaseQuery({ baseUrl: <VITE_API_URL>/api/auth })`, sets `Authorization: Bearer <accessToken>` from `getState()`, and on a `401` result (except for the `login`/`register` endpoints) awaits a **single shared** `/refresh` call (module-level mutex), dispatches `tokensRefreshed` on success + retries the original request once, or dispatches `loggedOut` on failure. Endpoints: `login` (`LoginRequest → LoginResponse`), `register` (`{email,name,password} → LoginResponse`), `refresh` (`{refreshToken} → { tokens: AuthTokens }`). Each uses `transformResponse: (r: ApiResponse<T>) => r.data`. The mutex + retry is the one non-obvious part of this file.

#### 6. Store

**File**: `apps/web-app/src/store.ts` (new)

**Intent**: Compose the reducers + RTK Query middleware and export typed `RootState`/`AppDispatch` + typed hooks.

**Contract**: `configureStore({ reducer: { auth: authReducer, [authApi.reducerPath]: authApi.reducer }, middleware: (gDM) => gDM().concat(authApi.middleware) })`. Export `RootState`, `AppDispatch`, and typed `useAppDispatch`/`useAppSelector` hooks (in `apps/web-app/src/hooks.ts` or co-located).

#### 7. Provider wiring

**File**: `apps/web-app/src/main.tsx`

**Intent**: Make the store available to the whole app.

**Contract**: Wrap `<RouterProvider>` in react-redux `<Provider store={store}>` inside `<StrictMode>`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter @instigi/web-app typecheck`
- Linting passes: `pnpm --filter @instigi/web-app lint`
- Production build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual Verification:

- With the store wired, the app still renders at `http://localhost:3000` with no console errors (store present but unused by UI yet).
- Redux DevTools shows the `auth` slice initialized from an empty `localStorage` (user `null`, tokens `null`).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding.

---

## Phase 2: Add the name field to the shared AuthForm

### Overview

Extend the shared `AuthForm` so sign-up collects the `name` the register endpoint requires, keeping validation in the shared component and updating its stories.

### Changes Required:

#### 1. AuthForm component

**File**: `packages/ui/src/components/AuthForm.tsx`

**Intent**: Collect `name` in `signUp` mode and include it in the submitted data; leave sign-in unchanged.

**Contract**: Extend `AuthFormData` to `{ email: string; password: string; name?: string }` (name present only in signUp). Add a controlled `name` `TextField` rendered only when `!isSignIn`, positioned before email, with a `nameError` ("Name is required") wired into the existing `validate`/`handleSubmit` flow and cleared on mode toggle. `onSubmit` payload includes `name` in signUp mode. Follow the existing field pattern (adornment icon, `disabled={loading}`, `sx={{ mb: 2 }}`).

#### 2. Story coverage

**File**: `packages/ui/src/components/AuthForm.stories.tsx`

**Intent**: Keep stories representative of the new signUp field per the house rule.

**Contract**: Ensure the `SignUp` (and `SignUpWithError`/interactive) stories render the name field; add a note/variant demonstrating the "Name is required" validation if useful. No new exports.

#### 3. Type re-export check

**File**: `packages/ui/src/index.ts`

**Intent**: Confirm `AuthFormData`/`AuthFormProps` remain exported with the widened type.

**Contract**: No change expected beyond verifying the existing `export type { AuthFormProps, AuthFormData }` now carries the optional `name`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter @instigi/ui typecheck`
- Linting passes: `pnpm --filter @instigi/ui lint`
- UI package tests pass: `pnpm --filter @instigi/ui test`
- UI package builds: `pnpm --filter @instigi/ui build`

#### Manual Verification:

- In Storybook (`pnpm --filter @instigi/ui storybook`), the SignUp story shows Email, Name, Password, Confirm Password; the SignIn story shows only Email + Password.
- Submitting signUp with an empty name shows "Name is required"; toggling to sign-in hides the field.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding.

---

## Phase 3: Wire AuthPage, auth-aware shell, and route guard

### Overview

Connect `AuthPage` to the login/register mutations with friendly error mapping and post-auth redirect; make `RootLayout` auth-aware with Sign Out; add a `ProtectedRoute` wrapper and a placeholder protected page in the router.

### Changes Required:

#### 1. Error-code → message map

**File**: `apps/web-app/src/features/auth/authErrors.ts` (new)

**Intent**: Translate API error `code`s (and network failures) into user-facing copy.

**Contract**: `authErrorMessage(error: unknown): string` maps `INVALID_CREDENTIALS` → "Incorrect email or password.", `EMAIL_TAKEN` → "An account with this email already exists.", `VALIDATION_ERROR` → "Please check the details you entered.", missing/`FETCH_ERROR` → "Can't reach the server. Check your connection and try again.", with a generic fallback. Reads `code` from the RTK Query error's `data` (shape `ApiError`).

#### 2. AuthPage wiring

**File**: `apps/web-app/src/pages/AuthPage.tsx`

**Intent**: Submit to the right mutation per mode, reflect loading/error in the form, persist the session, and redirect on success.

**Contract**: Use `useLoginMutation`/`useRegisterMutation`. On submit: call the mutation with form data (`{email,password}` or `{email,name,password}`), `.unwrap()`; on success dispatch `credentialsReceived` and `navigate('/', { replace: true })`; on failure set local `error` via `authErrorMessage`. Pass `loading` (mutation `isLoading`) and `error` into `AuthForm`. If already authenticated on mount, redirect to `/`.

#### 3. Auth-aware layout

**File**: `apps/web-app/src/layouts/RootLayout.tsx`

**Intent**: Show signed-in state (name/email + Sign Out) when authenticated; the current Sign In button otherwise.

**Contract**: Read `selectIsAuthenticated`/`selectCurrentUser`. When authenticated, replace the "Sign In / Sign Up" button with the user's name/email and a **Sign Out** button that dispatches `loggedOut` and navigates to `/auth`. When not, keep existing behavior.

#### 4. ProtectedRoute wrapper

**File**: `apps/web-app/src/components/ProtectedRoute.tsx` (new)

**Intent**: Reusable guard that redirects unauthenticated users to `/auth` — the pattern the workout slices will reuse.

**Contract**: A component that reads `selectIsAuthenticated`; renders `<Outlet />` (or `children`) when authed, else `<Navigate to="/auth" replace />`.

#### 5. Placeholder protected page + routing

**File**: `apps/web-app/src/pages/DashboardPage.tsx` (new) and `apps/web-app/src/router.tsx`

**Intent**: Give the guard something to protect and prove the redirect works end-to-end.

**Contract**: A minimal `DashboardPage` ("You're signed in" placeholder). Add a `/dashboard` route nested under `ProtectedRoute` in the existing `createBrowserRouter` tree. Keep `/`, `/auth`, `*` as-is. (Placeholder is explicitly temporary — noted in "What We're NOT Doing".)

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter @instigi/web-app typecheck`
- Linting passes: `pnpm --filter @instigi/web-app lint`
- Production build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual Verification:

- Against a running auth-service: register a new account → redirected to `/`, shell shows name + Sign Out; reload → still signed in.
- Log out → shell shows Sign In; visiting `/dashboard` while signed out redirects to `/auth`; after signing in, `/dashboard` renders.
- Wrong password shows "Incorrect email or password."; duplicate email on register shows "An account with this email already exists."; stopping the auth-service shows the network message.
- Leaving the tab idle past 15 minutes then acting keeps the user signed in (silent refresh; observe the `/refresh` call in the Network tab).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human before proceeding.

---

## Phase 4: Tests

### Overview

Cover the load-bearing logic: auth slice reducers (including rehydration) and the AuthPage flow (success + error) with a mocked `fetch`.

### Changes Required:

#### 1. Auth slice unit tests

**File**: `apps/web-app/src/features/auth/authSlice.test.ts` (new)

**Intent**: Verify state transitions and persistence side effects.

**Contract**: Test `credentialsReceived` sets user + tokens and writes `localStorage`; `tokensRefreshed` swaps tokens but preserves `user`; `loggedOut` clears state + `localStorage`; initial state rehydrates from a pre-seeded `localStorage`. Mock/stub `localStorage` (jsdom provides it; assert via the `authStorage` keys).

#### 2. AuthPage integration tests

**File**: `apps/web-app/src/pages/AuthPage.test.tsx` (new)

**Intent**: Verify the submit → dispatch → redirect/error path without a real server.

**Contract**: Render `AuthPage` inside a real store `<Provider>` + `MemoryRouter`, mocking `global.fetch`. Cases: successful login resolves `{ data: { user, tokens } }` → store becomes authenticated (and/or redirect asserted); a `401 INVALID_CREDENTIALS` response renders "Incorrect email or password." via the AuthForm Alert. Follow the existing RTL pattern in `App.test.tsx`.

### Success Criteria:

#### Automated Verification:

- Web-app tests pass: `pnpm --filter @instigi/web-app test`
- Type checking passes: `pnpm --filter @instigi/web-app typecheck`
- Linting passes: `pnpm --filter @instigi/web-app lint`
- Full monorepo checks pass: `pnpm lint && pnpm typecheck && pnpm test`

#### Manual Verification:

- New test files run within the existing Vitest config (no separate runner needed).
- Tests are deterministic across repeated runs (no reliance on real network/time).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human.

---

## Testing Strategy

### Unit Tests:

- `authSlice` reducers: `credentialsReceived`, `tokensRefreshed` (preserves user), `loggedOut`, and boot rehydration from `localStorage`.
- Edge case: corrupt/absent `localStorage` yields a clean unauthenticated initial state.
- `authErrorMessage` mapping for each known code + network fallback.

### Integration Tests:

- AuthPage login success (mocked `fetch` → `{ data: { user, tokens } }`) drives the store to authenticated.
- AuthPage login failure (mocked `401 INVALID_CREDENTIALS`) renders the friendly Alert message.

### Manual Testing Steps:

1. Start Postgres + auth-service (Docker/compose) and `pnpm --filter @instigi/web-app dev`.
2. Register a new account (email, name, password, confirm) → land on `/` signed in.
3. Reload → still signed in. Sign Out → shell shows Sign In.
4. Log in with wrong password → "Incorrect email or password."; register with an existing email → "An account with this email already exists."
5. Visit `/dashboard` signed out → redirected to `/auth`; sign in → `/dashboard` renders.
6. Stop auth-service, attempt login → network error message.
7. (Optional) shorten `JWT_EXPIRES_IN` locally to observe the silent `/refresh` on 401.

## Performance Considerations

Negligible — a handful of auth requests and small localStorage reads/writes. The only concurrency concern is the 401-refresh mutex (addressed in Critical Implementation Details) to avoid parallel `/refresh` storms.

## Migration Notes

No data migration. Purely additive frontend changes plus a widened optional `name` on the shared `AuthFormData` (backward compatible — sign-in callers unaffected). Auth-service and its schema are untouched.

## References

- Roadmap slice: `context/foundation/roadmap.md` → S-08 (`web-app-auth-flow`)
- API contract: `services/auth-service/src/controllers/auth.ts`, `services/auth-service/src/routes/auth.ts`, `services/auth-service/src/app.ts`
- Token lifetimes: `services/auth-service/src/jwt.ts`
- Shared types: `packages/types/src/index.ts`
- Shared form: `packages/ui/src/components/AuthForm.tsx`, `packages/ui/src/components/AuthForm.stories.tsx`
- Current stubs: `apps/web-app/src/pages/AuthPage.tsx`, `apps/web-app/src/layouts/RootLayout.tsx`, `apps/web-app/src/main.tsx`, `apps/web-app/src/router.tsx`
- Test pattern: `apps/web-app/src/App.test.tsx`, `apps/web-app/vite.config.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Redux store, auth API layer, and session persistence

#### Automated

- [x] 1.1 Type checking passes: `pnpm --filter @instigi/web-app typecheck` — 6bd2491
- [x] 1.2 Linting passes: `pnpm --filter @instigi/web-app lint` — 6bd2491
- [x] 1.3 Production build succeeds: `pnpm --filter @instigi/web-app build` — 6bd2491

#### Manual

- [x] 1.4 App renders at localhost:3000 with no console errors (store present but unused by UI) — 6bd2491
- [x] 1.5 Redux DevTools shows the `auth` slice initialized from empty localStorage — 6bd2491

### Phase 2: Add the name field to the shared AuthForm

#### Automated

- [x] 2.1 Type checking passes: `pnpm --filter @instigi/ui typecheck`
- [x] 2.2 Linting passes: `pnpm --filter @instigi/ui lint`
- [x] 2.3 UI package tests pass: `pnpm --filter @instigi/ui test`
- [x] 2.4 UI package builds: `pnpm --filter @instigi/ui build`

#### Manual

- [x] 2.5 Storybook: SignUp shows Email/Name/Password/Confirm; SignIn shows only Email/Password
- [x] 2.6 Empty name in signUp shows "Name is required"; toggling to sign-in hides the field

### Phase 3: Wire AuthPage, auth-aware shell, and route guard

#### Automated

- [ ] 3.1 Type checking passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 3.2 Linting passes: `pnpm --filter @instigi/web-app lint`
- [ ] 3.3 Production build succeeds: `pnpm --filter @instigi/web-app build`

#### Manual

- [ ] 3.4 Register → redirected to `/`, shell shows name + Sign Out; reload → still signed in
- [ ] 3.5 Sign Out → shell shows Sign In; `/dashboard` redirects to `/auth` when signed out, renders when signed in
- [ ] 3.6 Wrong password, duplicate email, and server-down each show their friendly message
- [ ] 3.7 Idle past access-token expiry then act → still signed in (silent `/refresh` observed in Network tab)

### Phase 4: Tests

#### Automated

- [ ] 4.1 Web-app tests pass: `pnpm --filter @instigi/web-app test`
- [ ] 4.2 Type checking passes: `pnpm --filter @instigi/web-app typecheck`
- [ ] 4.3 Linting passes: `pnpm --filter @instigi/web-app lint`
- [ ] 4.4 Full monorepo checks pass: `pnpm lint && pnpm typecheck && pnpm test`

#### Manual

- [ ] 4.5 New test files run within the existing Vitest config
- [ ] 4.6 Tests are deterministic across repeated runs
