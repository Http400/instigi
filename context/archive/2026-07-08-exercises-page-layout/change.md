---
change_id: exercises-page-layout
title: Exercises page layout scaffold
status: archived
created: 2026-07-08
updated: 2026-07-09
archived_at: 2026-07-09T09:50:40Z
---

## Notes

F-02 from context/foundation/roadmap.md. Foundation-style enabler: stand up the
UI/layout scaffold for the exercises page in the web app — the page shell, routing
entry, and layout regions (search area, list/grid region, empty/loading states)
that the exercise-library browse slice (S-01) fills with real data and behaviour.
No data fetching or business logic here beyond what S-01 needs; this exists purely
to unblock S-01 so that slice can focus on browsing/searching the seeded,
metric-configured exercise library. Web-app frontend only; auth-service and any
workout service API contracts are unchanged.
