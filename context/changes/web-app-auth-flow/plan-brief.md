# Web-App Sign In / Sign Up Flow — Plan Brief

> Full plan: `context/changes/web-app-auth-flow/plan.md`

## What & Why

Rebuild the web-app's sign in / sign up experience by wiring the existing `AuthPage` shell to the already-built, unchanged auth-service using Redux Toolkit + RTK Query. Today auth is a `console.log` stub; without a real client flow the app has no way for a user to actually get signed in — the precondition for every workout feature. This is roadmap slice **S-08**, independent of the workout track.

## Starting Point

`AuthPage` renders the shared `AuthForm` but only logs on submit; `RootLayout` always shows a static "Sign In" button; there's no Redux, no API client, and no base-URL config. The auth-service, by contrast, is complete: `POST /api/auth/{login,register,refresh}` returning `{ data: { user, tokens } }` with `{ message, code, statusCode }` errors, and shared `@instigi/types` already model `User`, `AuthTokens`, `LoginResponse`, `ApiResponse`, and `ApiError`.

## Desired End State

A user can create an account, log in, stay signed in across reloads, keep working past the 15-minute access-token expiry (silent refresh), see friendly error messages, and sign out. The app shell reflects auth state, and a `ProtectedRoute` guard (demonstrated on a placeholder `/dashboard`) establishes the pattern the workout slices will reuse. Auth-service code is untouched.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Sign-up `name` field | Add `name` to shared `AuthForm` (signUp only) | Register requires `name`; keep validation in the shared component | Plan |
| Token storage | localStorage, access + refresh, rehydrate on boot | Directly satisfies "stay signed in across reloads" with minimal code | Plan |
| Access-token expiry | Auto-refresh on 401 via baseQuery wrapper + mutex | Seamless session for the 7-day refresh window; standard RTK Query pattern | Plan |
| Post-auth flow | Redirect to `/`, auth-aware nav, **add** `ProtectedRoute` + placeholder page | Deliver signed-in UX and ready the guard infra for workout slices | Plan |
| Error UX | Map error `code`s to friendly copy via AuthForm `error` prop | AuthForm already has an Alert; specific, clean messages | Plan |
| Base URL | `VITE_API_URL` env var (default `http://localhost:4000`) | Standard Vite pattern; works in Docker/Railway | Plan |
| Testing depth | Auth slice reducers + AuthPage integration with mocked fetch | Covers state, persistence, and error mapping without a real server | Plan |

## Scope

**In scope:** Redux store + typed hooks; RTK Query `authApi` (login/register/refresh) with 401 auto-refresh; persisted `authSlice`; `name` field on shared `AuthForm`; AuthPage wiring + error mapping + redirect; auth-aware `RootLayout` with Sign Out; `ProtectedRoute` + placeholder `/dashboard`; `VITE_API_URL` config; unit + integration tests.

**Out of scope:** Any auth-service change (incl. server-side logout); httpOnly-cookie architecture; "Remember me" / "Forgot password"; workout/domain pages; admin-app; role-based routing.

## Architecture / Approach

Bottom-up. A single `authStorage` helper owns the localStorage keys and is used by the slice's initial state (rehydration), its reducers (set/clear), and the baseQuery wrapper (reading tokens). `authSlice` holds `{ user, accessToken, refreshToken, status }`; `isAuthenticated` derives from `accessToken`. `authApi`'s `baseQueryWithReauth` attaches the bearer token and, on a 401 (except for login/register), awaits one shared `/refresh` (mutex), swaps tokens, and retries once — or logs out. `main.tsx` wraps `<RouterProvider>` in the Redux `<Provider>`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Store + auth API + persistence | Redux store, RTK Query authApi (401 refresh), persisted authSlice, Provider, env config | 401-refresh race → parallel refresh storms (mitigated by mutex) |
| 2. AuthForm name field | Shared form collects `name` in signUp + stories | Touching `packages/ui` affects any consumer of `AuthFormData` |
| 3. AuthPage + shell + guard | Wired mutations, error mapping, redirect, Sign Out nav, ProtectedRoute + placeholder page | Redirect/guard edge cases; refresh preserving `user` |
| 4. Tests | Auth slice unit tests + AuthPage integration (mocked fetch) | Simulating envelope/401 responses in jsdom |

**Prerequisites:** Local Postgres + auth-service running for manual verification; `pnpm` install after adding deps.
**Estimated effort:** ~3-4 focused sessions across 4 phases.

## Open Risks & Assumptions

- Tokens in localStorage are XSS-readable — accepted for pre-launch MVP; revisit (httpOnly cookies) before public launch, which would require an auth-service change out of scope here.
- The placeholder `/dashboard` page is temporary scaffolding to exercise the guard; workout slices replace it with real protected pages.
- Assumes the auth-service `/refresh` contract stays `{ refreshToken } → { data: { tokens } }` (verified in code).

## Success Criteria (Summary)

- A user can register/login, reload and stay signed in, and sign out — verified manually against a running auth-service.
- Access-token expiry is handled silently (no forced re-login within the refresh window).
- `pnpm lint && pnpm typecheck && pnpm test` all pass; auth-service code unchanged.
