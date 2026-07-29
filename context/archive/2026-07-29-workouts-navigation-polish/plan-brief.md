# Polish the Logged-in Workouts Navigation — Plan Brief

> Full plan: `context/changes/workouts-navigation-polish/plan.md`

## What & Why

A web-app-only navigation/layout polish for the logged-in experience: redirect to
`/workouts` after sign-in, link the logo to `/workouts`, and remove the desktop
top bar. The goal is a tighter, more direct workout flow — the app opens on the
thing users came to do, and the chrome gets out of the way.

## Starting Point

Auth redirects to `/`; a `RootLayout` top bar shows the user name + "Sign Out" on
every page; the sidebar logo isn't clickable. On mobile the sidebar is hidden, so
that top bar is currently the only way to sign out.

## Desired End State

Sign-in and logo clicks both land on `/workouts`. The desktop top bar is gone; on
mobile a minimal top bar (logo + sign-out) preserves the sign-out affordance.
Desktop sign-out stays in the sidebar footer.

## Key Decisions Made

| Decision                         | Choice                                                                 | Why (1 sentence)                                                        | Source |
| -------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| Workout history on /workouts     | Dropped from scope                                                     | User decided against showing history below the active session.         | Plan   |
| Mobile sign-out after bar removal| Keep a minimal mobile-only top bar (logo + sign-out) in `AppLayout`    | Mobile has no other sign-out once the desktop bar is removed.          | Plan   |
| Logo link scope                  | Desktop sidebar logo + the new mobile top-bar logo → `/workouts`       | Both visible logos should return to the primary screen.                | Plan   |

## Scope

**In scope:**
- Post-login redirect `/` → `/workouts`
- Sidebar + mobile logo → `/workouts`
- Remove desktop `RootLayout` AppBar; add mobile-only top bar with sign-out

**Out of scope:**
- Rendering workout history on `/workouts` (dropped)
- Any change to the `/workouts/history` route / `HistoryPage` / "History" nav items
- Any backend, API, Redux, or data-model change
- Disabled nav items (Calendar, Statistics, Settings, bottom-nav "More")
- `HomePage` / `DashboardPage` content changes (beyond AppBar removal effect)

## Architecture / Approach

Redirect and logo changes are small prop/string edits. Chrome is restructured
last: delete the `RootLayout` AppBar and add a mobile-only `AppBar` inside
`AppLayout`, keeping the change contained to the authenticated shell.

## Phases at a Glance

| Phase                          | What it delivers                                          | Key risk                                                        |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Redirects & logo link       | `/workouts` after login; clickable sidebar logo          | Missing one of the two `AuthPage` redirect sites               |
| 2. Top-bar restructure         | Desktop bar removed; mobile bar with logo + sign-out     | Mobile content clipped by the new bar; stray unused symbols    |

**Prerequisites:** Roadmap slice S-09 prereqs S-04 and S-08 are done. No new
dependencies or access needed.
**Estimated effort:** ~1 session across 2 small phases.

## Open Risks & Assumptions

- Mobile top bar must offset page content so nothing is hidden under it (mirrors
  the existing bottom-nav offset).
- Removing the `RootLayout` AppBar assumes `HomePage`'s own sign-in button is a
  sufficient entry point for the public landing page (verified in code).

## Success Criteria (Summary)

- Signing in lands on `/workouts`.
- The logo (desktop sidebar and mobile top bar) returns to `/workouts`.
- No desktop top bar; mobile users can still sign out from a minimal top bar, and
  no content is clipped.
