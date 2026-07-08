# Exercises Page Layout Scaffold Implementation Plan

## Overview

Stand up the web-app UI/layout scaffold for the Exercises page (roadmap **F-02**), matching the provided design (`exercises-page-layout/exercises-page.png`) using Material UI components with minimal custom styling. This is a **foundation** enabler: it delivers the page shell, a sidebar app-shell layout, the route entry behind auth, and all layout regions (search, filters, table, empty/loading placeholders) populated with **static placeholder data**. It deliberately contains **no data fetching or business logic** — slice **S-01 (`exercise-library-browse`)** will replace the static data with a real, searchable, metric-configured exercise library.

## Current State Analysis

The web app (`apps/web-app`) is a React 19 + Vite SPA using `react-router` v7 (`createBrowserRouter` with `Component` props) and MUI v9. Key facts discovered:

- **Routing** (`src/router.tsx`): a single `RootLayout` wraps `HomePage`, `AuthPage`, a `ProtectedRoute`-guarded `DashboardPage`, and a `NotFoundPage`.
- **Layout** (`src/layouts/RootLayout.tsx`): a top MUI `AppBar` with a Sign In / Sign Out control driven by the auth slice. There is **no sidebar layout**.
- **Auth guard** (`src/components/ProtectedRoute.tsx`): renders nested routes when `selectIsAuthenticated`, else `<Navigate to="/auth" replace />`. This is the pattern to reuse.
- **Pages** (`src/pages/*.tsx`): plain MUI `Container`/`Box`/`Typography`; no exercises/workout UI exists.
- **Theme** (`packages/ui/src/theme.ts`): already `mode: 'dark'`, `primary.main: '#E8734A'`, `background.default: '#0E1420'`, `paper: '#131B2A'` — an exact match for the design. **No theming work is required.**
- **Auth state** (`src/features/auth/authSlice.ts`): `selectCurrentUser` / `selectIsAuthenticated` exist for the sidebar user card.
- **Testing** (`src/App.test.tsx`, `src/pages/AuthPage.test.tsx`): Vitest + React Testing Library + `MemoryRouter`, wrapping in a Redux `Provider` when store state is needed.
- **UI package** (`packages/ui/src/index.ts`): thin MUI wrappers (`Button`, `TextField`, `AuthForm`, `Logo`, `LogoIcon`) each with a `*.stories.tsx`. Per this plan's decision, new pieces stay local to `apps/web-app` and are not promoted here.

## Desired End State

An authenticated user navigating to `/exercises` sees a page matching the design:

- A **left sidebar** (permanent) with the Instigi logo, navigation items (Workouts, **Exercises** active, Progress, Calendar, Statistics, Settings), and a bottom user card showing the signed-in user's initials/name.
- A **main content area** with: an "Exercises" header + subtitle and a top-right "New exercise" button; a full-width search field; a filter-chip row (All / Strength / Cardio / Swimming / Mobility / Custom) with a right-aligned "All status" select; a table listing exercises (Exercise, Category, Metrics, Actions) with static placeholder rows; and a "N exercises" footer count.

**Verification:** `/exercises` renders the sidebar shell + table when authenticated, redirects to `/auth` when not, all built from MUI components, and `pnpm --filter web-app test` + `pnpm lint` + `pnpm typecheck` pass. The controls are visually present but inert (no filtering/fetching) — that behaviour arrives in S-01.

### Key Discoveries:

- Route guard pattern to reuse: `src/components/ProtectedRoute.tsx` (renders `<Outlet/>` or redirects).
- Nested-route wiring convention: `src/router.tsx` uses `Component:` and `children:`.
- Sidebar user identity is already available via `selectCurrentUser` (`src/features/auth/authSlice.ts:*`).
- Theme already matches the design — build with theme tokens, avoid hardcoded colors.
- Tests that touch auth state use a `configureStore` + `Provider` helper (`src/pages/AuthPage.test.tsx`).

## What We're NOT Doing

- No data fetching, RTK Query endpoints, or API calls (S-01 owns this).
- No real search, filtering, sorting, pagination, or "All status" behaviour — controls are inert placeholders.
- No "New exercise" / create flow, no row "Actions" menu behaviour (later slices; the design's custom-exercise creation is a PRD Non-Goal for v1).
- No backend, schema, or workout-service work.
- No theme changes and no promotion of components into `packages/ui`.
- No migration of existing pages (Home/Dashboard) into the new sidebar shell — the shell is introduced for the authed exercises route only.
- No responsive/mobile-drawer collapse behaviour beyond what MUI defaults give for free (desktop-first, matching the design).

## Implementation Approach

Build in two phases. Phase 1 introduces a reusable authenticated **app-shell layout** (`AppLayout`) with the sidebar and wires the guarded `/exercises` route so the shell is verifiable in isolation. Phase 2 fills the main content region with the Exercises page pieces (header, search, filters, table, footer) plus reusable empty/loading placeholder components that S-01 will switch between. All presentational pieces live under `apps/web-app/src` (page + local components), use MUI components, and rely on the existing theme with `sx` for spacing only.

## Phase 1: Sidebar app-shell layout + routing

### Overview

Create an authenticated app-shell layout with a permanent left sidebar and wire `/exercises` behind the existing auth guard, rendering a placeholder page body so the shell is independently testable.

### Changes Required:

#### 1. App-shell layout component

**File**: `apps/web-app/src/layouts/AppLayout.tsx` (new)

**Intent**: Provide the authenticated shell chrome shown in the design — a permanent left sidebar with logo, primary navigation, and a bottom user card — with the routed page rendered in the main region. Reuses the auth slice for the user card and sign-out.

**Contract**: A default-export React component rendering an MUI permanent `Drawer` (or `Box` + `Drawer variant="permanent"`) alongside a main content `Box` containing `<Outlet />`. Sidebar built from `List` / `ListItemButton` / `ListItemIcon` / `ListItemText`; nav model is a local array `{ label, icon, to?, disabled? }` where only Exercises has a `to` (`/exercises`) and is marked selected via `useLocation`; the rest are `disabled`. Logo via `@instigi/ui` `Logo`. Bottom user card reads `selectCurrentUser` and renders an `Avatar` with initials + name; a menu/button offers Sign Out via `dispatch(loggedOut())` then `navigate('/auth', { replace: true })` (mirroring `RootLayout`). Uses theme tokens; `sx` for layout spacing only.

#### 2. Route wiring

**File**: `apps/web-app/src/router.tsx`

**Intent**: Add the `/exercises` route inside the auth-guarded branch, rendered within the new `AppLayout`.

**Contract**: Under the existing `ProtectedRoute` `Component` node, nest `AppLayout` as a layout route whose `children` include `{ path: 'exercises', Component: ExercisesPage }`. `DashboardPage` remains where it is (not migrated). Import `AppLayout` and `ExercisesPage`.

#### 3. Exercises page stub

**File**: `apps/web-app/src/pages/ExercisesPage.tsx` (new, expanded in Phase 2)

**Intent**: Provide a minimal default-export page so Phase 1 routing/shell is testable before content lands.

**Contract**: Default-export component rendering a `Container`/`Box` with an "Exercises" `Typography` heading. Replaced/expanded in Phase 2.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter web-app typecheck` (or `pnpm typecheck`)
- Linting passes: `pnpm lint`
- Web-app tests pass: `pnpm --filter web-app test`
- New test asserts an authenticated render of `/exercises` shows the sidebar nav (e.g. "Exercises" nav item) and that an unauthenticated render redirects to `/auth`.

#### Manual Verification:

- Visiting `/exercises` while signed in shows the left sidebar (logo, nav items, user card) with Exercises highlighted.
- Visiting `/exercises` while signed out redirects to `/auth`.
- Disabled nav items are visibly inert; Sign Out from the sidebar works.
- Layout matches the design's shell structure and uses theme colors (no hardcoded palette).

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation that the shell renders and guards correctly before starting Phase 2. Phase blocks use plain bullets; the `- [ ]` checkboxes live in `## Progress`.

---

## Phase 2: Exercises page content region

### Overview

Fill the Exercises page main region to match the design: header + New exercise button, search field, filter-chip row + status select, exercises table with static placeholder rows and a count footer, plus reusable empty/loading placeholder components for S-01.

### Changes Required:

#### 1. Static placeholder data + types

**File**: `apps/web-app/src/pages/exercises/placeholderExercises.ts` (new)

**Intent**: Provide the sample rows shown in the design so the layout is realistic, isolated in one file S-01 can delete when wiring real data.

**Contract**: Export a local `PlaceholderExercise` type (`name`, `category`, `metrics: string[]`, and an `icon` hint) and a `PLACEHOLDER_EXERCISES` array reproducing the design's five rows (Bench Press/Strength/Reps,Load; Running/Cardio/Distance,Duration; Freestyle Swimming/Swimming/Distance,Duration; Plank/Mobility/Duration; Pull-ups/Strength/Reps). No fetching.

#### 2. Filter/search controls

**File**: `apps/web-app/src/pages/exercises/ExercisesToolbar.tsx` (new)

**Intent**: Render the search field, category filter chips, and status select from the design as inert presentational controls.

**Contract**: Default-export component rendering a `TextField` with a search `InputAdornment` (placeholder "Search exercises…"), a horizontal row of MUI `Chip`s (`All` selected/outlined-primary, `Strength`, `Cardio`, `Swimming`, `Mobility`, `Custom`), and a right-aligned MUI `Select` defaulting to "All status". Controls are uncontrolled/inert (no state wiring); category list is a local constant. Layout via `Stack`/`Box` + `sx` spacing only.

#### 3. Exercises table

**File**: `apps/web-app/src/pages/exercises/ExercisesTable.tsx` (new)

**Intent**: Render the exercises table matching the design's columns, category chips, and metric cells from placeholder data.

**Contract**: Default-export component accepting `rows: PlaceholderExercise[]`. Renders MUI `Table`/`TableHead`/`TableBody` with columns **Exercise** (icon + name), **Category** (colored `Chip` keyed by category), **Metrics** (icon + comma-joined text), **Actions** (an `IconButton` with `MoreVertIcon`, inert). Category chip color derives from a local `category → color` map using theme palette tokens. Icons from `@mui/icons-material`.

#### 4. Empty & loading placeholders

**File**: `apps/web-app/src/pages/exercises/ExercisesStates.tsx` (new)

**Intent**: Provide the empty-state and loading (skeleton) presentations S-01 will toggle between; not shown by default in the scaffold.

**Contract**: Export `ExercisesEmptyState` (centered `Typography` + icon, "No exercises found" copy) and `ExercisesLoading` (a `Table` body of MUI `Skeleton` rows matching the table columns). Pure presentational, no state.

#### 5. Assemble the Exercises page

**File**: `apps/web-app/src/pages/ExercisesPage.tsx`

**Intent**: Compose the page: header + New exercise button, toolbar, table over placeholder data, and the count footer — matching the design.

**Contract**: Default-export page rendering a header row (`Typography` h4 "Exercises" + secondary subtitle "Manage your exercise definitions and metrics." on the left; a contained `Button` with `AddIcon` "New exercise" on the right, inert/disabled). Below: `<ExercisesToolbar />`, then `<ExercisesTable rows={PLACEHOLDER_EXERCISES} />` inside a `Paper`, then a centered footer `Typography` showing `` `${PLACEHOLDER_EXERCISES.length} exercises` ``. Spacing via `sx`; no data fetching.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `pnpm --filter web-app typecheck` (or `pnpm typecheck`)
- Linting passes: `pnpm lint`
- Web-app tests pass: `pnpm --filter web-app test`
- New test asserts the Exercises page renders the search field, the category filter chips, the table column headers (Exercise/Category/Metrics/Actions), at least one placeholder row (e.g. "Bench Press"), and the "5 exercises" footer.

#### Manual Verification:

- The rendered page visually matches `exercises-page-layout/exercises-page.png` (header, New exercise button, search, filter chips + status select, table rows with category chips and metric icons, footer count).
- Built from MUI components with the existing dark theme; no meaningful custom CSS beyond `sx` spacing.
- Inert controls (search, chips, status, New exercise, row actions) render but perform no action — ready for S-01 to wire.

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation that the page matches the design before considering the change done.

---

## Testing Strategy

### Unit Tests:

- Exercises page renders header, search field, filter chips, table headers, a placeholder row, and the count footer.
- `AppLayout` renders navigation items and the signed-in user's identity.

### Integration Tests:

- Router-level: authenticated visit to `/exercises` renders the shell + table; unauthenticated visit redirects to `/auth`.

### Manual Testing Steps:

1. Sign in, navigate to `/exercises`, confirm the layout matches the design.
2. Sign out (or clear auth), navigate to `/exercises`, confirm redirect to `/auth`.
3. Confirm disabled nav items and inert controls do nothing.
4. Resize the window to confirm no obvious layout breakage at desktop widths.

## Performance Considerations

None — static presentational scaffold with a handful of placeholder rows.

## Migration Notes

None — additive. Existing routes/pages are untouched; the sidebar shell is introduced only for the new authed exercises route.

## References

- Design: `exercises-page-layout/exercises-page.png`
- Roadmap item: `context/foundation/roadmap.md` → F-02, unlocks S-01
- Route guard pattern: `apps/web-app/src/components/ProtectedRoute.tsx`
- Layout/auth pattern: `apps/web-app/src/layouts/RootLayout.tsx`
- Theme: `packages/ui/src/theme.ts`
- Test pattern: `apps/web-app/src/pages/AuthPage.test.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Sidebar app-shell layout + routing

#### Automated

- [x] 1.1 Type checking passes: `pnpm --filter web-app typecheck`
- [x] 1.2 Linting passes: `pnpm lint`
- [x] 1.3 Web-app tests pass: `pnpm --filter web-app test`
- [x] 1.4 Test asserts authed `/exercises` shows sidebar nav and unauthenticated redirects to `/auth`

#### Manual

- [x] 1.5 Authed `/exercises` shows the sidebar (logo, nav, user card) with Exercises highlighted
- [x] 1.6 Unauthenticated `/exercises` redirects to `/auth`
- [x] 1.7 Disabled nav items inert; sidebar Sign Out works
- [x] 1.8 Shell matches design structure using theme colors (no hardcoded palette)

### Phase 2: Exercises page content region

#### Automated

- [ ] 2.1 Type checking passes: `pnpm --filter web-app typecheck`
- [ ] 2.2 Linting passes: `pnpm lint`
- [ ] 2.3 Web-app tests pass: `pnpm --filter web-app test`
- [ ] 2.4 Test asserts search, filter chips, table headers, a placeholder row, and "5 exercises" footer render

#### Manual

- [ ] 2.5 Rendered page visually matches `exercises-page.png`
- [ ] 2.6 Built from MUI components with the dark theme; no meaningful custom CSS
- [ ] 2.7 Inert controls render but perform no action (ready for S-01)
