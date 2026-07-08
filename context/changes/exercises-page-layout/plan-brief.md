# Exercises Page Layout Scaffold — Plan Brief

> Full plan: `context/changes/exercises-page-layout/plan.md`

## What & Why

Build the web-app UI/layout scaffold for the Exercises page (roadmap **F-02**) to match the provided design, using Material UI components with minimal custom styling. It exists purely to unblock slice **S-01 (`exercise-library-browse`)** so that slice can focus on real browsing/searching data instead of also building the page layout.

## Starting Point

`apps/web-app` is a React 19 + Vite SPA on `react-router` v7 and MUI v9. Today it has a top-`AppBar` `RootLayout`, a `ProtectedRoute` auth guard, and simple MUI pages (Home/Auth/Dashboard/404). No sidebar layout and no exercises UI exist. The MUI theme is already dark with the design's exact orange primary — so no theming work is needed.

## Desired End State

An authenticated user at `/exercises` sees the design: a permanent left sidebar (logo, nav items, bottom user card) and a main area with an "Exercises" header + "New exercise" button, a search field, a filter-chip row + "All status" select, an exercises table (Exercise / Category / Metrics / Actions) filled with static placeholder rows, and a "5 exercises" footer. All controls are visually present but inert.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Route & access | `/exercises` behind `ProtectedRoute` | Workout flow is for signed-in users; reuses existing guard. | Plan |
| Content region shape | MUI `Table` (not card grid) | The design specifies a table with Exercise/Category/Metrics/Actions columns. | Plan |
| App shell | New sidebar `AppLayout` for authed pages | Design shows a full left-sidebar shell; nav links where routes exist, inert otherwise. | Plan |
| Component placement | Local to `apps/web-app` | Avoid premature promotion to `packages/ui`; promote later only if reused. | Plan |
| Data | Static placeholder rows, no fetching | It's a layout scaffold; S-01 owns real data. | Plan |
| Theme | Reuse existing dark theme, `sx` spacing only | Theme already matches design; keep custom CSS minimal per user request. | Plan |

## Scope

**In scope:** sidebar app-shell layout; `/exercises` guarded route; page header + inert "New exercise" button; search field; filter chips + status select (inert); exercises table with static rows; count footer; reusable empty/loading placeholder components.

**Out of scope:** any data fetching / RTK Query; real search/filter/sort/pagination; create-exercise flow and row actions; backend/schema/workout-service work; theme changes; promoting components to `packages/ui`; migrating existing pages into the sidebar.

## Architecture / Approach

A new `AppLayout` (permanent MUI `Drawer` + `List` nav + user card reading the auth slice) wraps the auth-guarded route branch; `ExercisesPage` renders in its `<Outlet/>`. The page composes local presentational components — `ExercisesToolbar`, `ExercisesTable`, `ExercisesStates` (empty/loading) — over a `placeholderExercises.ts` data file. Everything uses MUI + the existing theme; `sx` handles spacing only.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Sidebar app-shell + routing | `AppLayout` sidebar shell + guarded `/exercises` route + page stub | Sidebar chrome diverging from the design; auth-guard regressions |
| 2. Exercises page content | Header/button, search, filter chips + status select, table with static rows, footer, empty/loading placeholders | Visual mismatch with the design; accidental behaviour/state creep |

**Prerequisites:** none beyond the current web-app baseline (auth slice, router, theme all present).
**Estimated effort:** ~1–2 sessions across 2 phases.

## Open Risks & Assumptions

- The design's sidebar nav lists future destinations (Workouts, Progress, Calendar, Statistics, Settings) that don't exist yet — assumed inert/disabled until their slices land.
- Placeholder rows mirror the design's five exercises; S-01 will delete `placeholderExercises.ts` when wiring real data.
- Desktop-first layout; no dedicated mobile-drawer collapse work beyond MUI defaults.

## Success Criteria (Summary)

- Authenticated `/exercises` renders the sidebar shell + exercises table matching the design; unauthenticated redirects to `/auth`.
- Page is built from MUI components on the existing theme with no meaningful custom CSS.
- `pnpm --filter web-app test`, `pnpm lint`, and `pnpm typecheck` all pass; controls are inert and ready for S-01 to wire.
