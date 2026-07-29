---
change_id: workouts-navigation-polish
title: Polish the logged-in workouts navigation
status: implemented
created: 2026-07-29
updated: 2026-07-29
---

## Notes

Roadmap slice S-09 (prereqs S-04, S-08 both done ✓). Outcome: user is
redirected to `/workouts` after signing in, returns to `/workouts` by clicking
the logo, and no longer sees the desktop top bar.

PRD refs: US-01, FR-002. Web-app-only navigation/layout refinement;
no backend, API, or data-model changes.

Scope decisions (from planning):
- "Remove top bar" = remove the desktop `RootLayout` AppBar, but add a minimal
  mobile-only top bar (logo + sign-out) in `AppLayout` so mobile keeps a
  sign-out affordance.
- Showing workout history on `/workouts` was dropped from scope; history stays
  on its existing `/workouts/history` page.
