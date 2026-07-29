# Polish the Logged-in Workouts Navigation — Implementation Plan

## Overview

A web-app-only navigation and layout polish for the logged-in experience. Three
user-visible changes: (1) signing in redirects to `/workouts`, (2) clicking the
logo goes to `/workouts`, and (3) the desktop top bar (user name + "Sign Out") is
removed, replaced on mobile by a minimal top bar (logo + sign-out) so mobile
users retain a way to sign out.

Roadmap slice: **S-09 `workouts-navigation-polish`**. PRD refs: US-01, FR-002.
No backend, API, or data-model changes.

## Current State Analysis

- **Routing** (`apps/web-app/src/router.tsx`): `RootLayout` wraps everything;
  `ProtectedRoute` → `AppLayout` hosts `/workouts`, `/workouts/history`,
  `/workouts/:sessionId`, `/exercises`, `/progress`. `HomePage` (`/`) and
  `DashboardPage` (`/dashboard`) sit outside `AppLayout`.
- **Top bar** (`apps/web-app/src/layouts/RootLayout.tsx`): a `RootLayout`-level
  `<AppBar>` renders on every non-`/auth` page. When authenticated it shows the
  user name + a "Sign Out" button; otherwise a "Sign In / Sign Up" button. It
  also provides `ThemeProvider` + `CssBaseline` + `<Outlet/>` (these stay).
- **App shell** (`apps/web-app/src/layouts/AppLayout.tsx`): permanent left
  `Drawer` on `md+` (holds the desktop sign-out in its footer) and a fixed
  `BottomNavigation` on `xs`. The drawer is `display: { xs: 'none', md: 'block' }`,
  so on mobile the **only** sign-out today is the `RootLayout` top bar. The
  sidebar shows `<Logo orientation="horizontal" />` with no click handler.
- **Auth** (`apps/web-app/src/pages/AuthPage.tsx`): after login/register it
  redirects to `/` in two places — the `useEffect` guard (already-authenticated)
  and the `handleSubmit` success path.
- **Logo** (`packages/ui/src/components/Logo.tsx`): `LogoProps extends
  Omit<BoxProps,'color'>` and spreads `...props` onto its root `Box`, so
  `onClick`/`sx` pass straight through — no component change needed.
- **HomePage** (`apps/web-app/src/pages/HomePage.tsx`): has its own
  "Sign In / Sign Up" button, so removing the `RootLayout` AppBar does not strand
  the public landing page.

## Desired End State

- Signing in (or landing on `/auth` while already authenticated) redirects to
  `/workouts`.
- Clicking the desktop sidebar logo or the mobile top-bar logo navigates to
  `/workouts`.
- No desktop top bar. On `xs`, a minimal top bar shows the logo + a sign-out
  control; on `md+`, sign-out remains in the sidebar footer as today.

Verify: `pnpm --filter web-app typecheck && pnpm --filter web-app lint` pass, and
manual walkthrough on desktop + narrow viewport confirms each behavior.

### Key Discoveries:

- `Logo` forwards `onClick`/`sx` via `...props` (`packages/ui/src/components/Logo.tsx`)
  — making it clickable is a prop change, not a component edit.
- The `AppLayout` drawer is `display: { xs: 'none', md: 'block' }`
  (`apps/web-app/src/layouts/AppLayout.tsx`) — this is why removing the
  `RootLayout` top bar requires a mobile-only sign-out replacement.
- `AppLayout` already has `handleSignOut` and `navigate` wired — the mobile top
  bar reuses them.

## What We're NOT Doing

- **Not** rendering workout history on `/workouts` (dropped from scope). History
  stays on its existing `/workouts/history` page; the route, `HistoryPage`, and
  the "History" nav items are unchanged.
- **Not** changing any backend, API, Redux slice, or data model.
- **Not** changing the auth-service or its contracts.
- **Not** touching `DashboardPage` / `HomePage` content beyond the AppBar removal
  side effect (both already function without the top bar).
- **Not** implementing the disabled nav items (Calendar, Statistics, Settings,
  bottom-nav "More").

## Implementation Approach

Do the redirect and logo-link changes as small prop/string edits. Restructure the
chrome last: delete the `RootLayout` AppBar and add a mobile-only `AppBar` inside
`AppLayout` so the change is contained to the authenticated shell.

## Phase 1: Post-login redirect & logo link

### Overview

Redirect to `/workouts` after authentication and make the desktop sidebar logo a
link to `/workouts`.

### Changes Required:

#### 1. Redirect after login/register to /workouts

**File**: `apps/web-app/src/pages/AuthPage.tsx`

**Intent**: Send authenticated users to `/workouts` instead of `/` from both the
already-authenticated `useEffect` guard and the `handleSubmit` success path.

**Contract**: Both `navigate('/', { replace: true })` calls become
`navigate('/workouts', { replace: true })`.

#### 2. Make the sidebar logo navigate to /workouts

**File**: `apps/web-app/src/layouts/AppLayout.tsx`

**Intent**: Clicking the sidebar `Logo` navigates to `/workouts`.

**Contract**: Pass `onClick={() => navigate('/workouts')}` and
`sx={{ cursor: 'pointer' }}` to the existing `<Logo orientation="horizontal" />`
in the drawer `Toolbar` (props forward through `Logo`'s `...props`).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter web-app typecheck`
- Linting passes: `pnpm --filter web-app lint`

#### Manual Verification:

- Signing in redirects to `/workouts`.
- Visiting `/auth` while already signed in redirects to `/workouts`.
- Clicking the desktop sidebar logo navigates to `/workouts`.

**Implementation Note**: After completing this phase and all automated
verification passes, pause for manual confirmation before proceeding.

---

## Phase 2: Top-bar restructure

### Overview

Remove the desktop `RootLayout` top bar and add a minimal mobile-only top bar in
`AppLayout` carrying the logo (→ `/workouts`) and a sign-out control.

### Changes Required:

#### 1. Remove the RootLayout AppBar

**File**: `apps/web-app/src/layouts/RootLayout.tsx`

**Intent**: Delete the `<AppBar>`/`<Toolbar>` block (user name + Sign Out /
Sign In button) so no desktop top bar renders. Preserve `ThemeProvider`,
`CssBaseline`, and `<Outlet/>`.

**Contract**: Remove the AppBar JSX and any now-unused imports/vars
(`AppBar`, `Toolbar`, `Button`, `Stack`, `Link`, `useLocation`, `hideChrome`,
`handleSignOut`, `isAuthenticated`, `user`, auth-slice selectors/`useAppDispatch`
if unused after removal). Component returns `ThemeProvider > (CssBaseline,
Outlet)`.

#### 2. Add a mobile-only top bar in AppLayout

**File**: `apps/web-app/src/layouts/AppLayout.tsx`

**Intent**: On `xs` only, render a slim top bar containing the logo (navigates to
`/workouts`) and a sign-out control, so mobile keeps a sign-out affordance after
the desktop bar is gone. Desktop (`md+`) is unchanged — sign-out stays in the
sidebar footer.

**Contract**: A mobile-only `AppBar`/`Toolbar` (`display: { xs: 'flex',
md: 'none' }`) at the top of the layout, with `<Logo>` (`onClick` →
`/workouts`, `cursor: pointer`) and a sign-out `IconButton`/`Button` calling the
existing `handleSignOut`. Ensure the main content is not obscured (use a static
bar in flow, or add top offset on `xs` to mirror the existing
`BOTTOM_NAV_HEIGHT` bottom offset).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter web-app typecheck`
- Linting passes: `pnpm --filter web-app lint`
- No unused-symbol lint errors in `RootLayout.tsx`.

#### Manual Verification:

- No top bar on desktop; the sidebar (with footer sign-out) is unchanged.
- On a narrow viewport, a minimal top bar shows the logo + sign-out.
- Mobile sign-out logs the user out and lands on `/auth`.
- Mobile top-bar logo navigates to `/workouts`.
- Main content is not hidden behind the mobile top bar or bottom nav.
- The public `/` page still offers a way to reach sign-in.

**Implementation Note**: After completing this phase and all automated
verification passes, pause for manual confirmation.

---

## Testing Strategy

### Unit Tests:

- No new unit tests required; changes are presentational/navigational and the
  repo has no component tests for these layouts. Rely on typecheck + lint +
  manual verification.

### Manual Testing Steps:

1. Sign in → land on `/workouts`.
2. Visit `/auth` while signed in → redirect to `/workouts`.
3. Click the desktop sidebar logo → `/workouts`.
4. Desktop: confirm no top bar; sidebar footer sign-out works.
5. Narrow viewport: confirm the mobile top bar (logo + sign-out); test both.
6. Confirm content isn't clipped by the mobile top bar or bottom nav.

## Performance Considerations

Negligible — small navigational/layout edits, no new data fetching.

## Migration Notes

None — no data or API changes.

## References

- Roadmap slice: `context/foundation/roadmap.md` → S-09
- Related change: `change.md` (this folder)
- Logo prop-forwarding: `packages/ui/src/components/Logo.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Post-login redirect & logo link

#### Automated

- [x] 1.1 Type checking passes: `pnpm --filter web-app typecheck`
- [x] 1.2 Linting passes: `pnpm --filter web-app lint`

#### Manual

- [x] 1.3 Signing in redirects to `/workouts`
- [x] 1.4 Visiting `/auth` while signed in redirects to `/workouts`
- [x] 1.5 Clicking the desktop sidebar logo navigates to `/workouts`

### Phase 2: Top-bar restructure

#### Automated

- [ ] 2.1 Type checking passes: `pnpm --filter web-app typecheck`
- [ ] 2.2 Linting passes: `pnpm --filter web-app lint`
- [ ] 2.3 No unused-symbol lint errors in `RootLayout.tsx`

#### Manual

- [ ] 2.4 No top bar on desktop; sidebar (with footer sign-out) unchanged
- [ ] 2.5 Narrow viewport shows a minimal top bar with logo + sign-out
- [ ] 2.6 Mobile sign-out logs out and lands on `/auth`
- [ ] 2.7 Mobile top-bar logo navigates to `/workouts`
- [ ] 2.8 Content is not hidden behind the mobile top bar or bottom nav
- [ ] 2.9 The public `/` page still offers a way to reach sign-in
