---
change_id: workout-detail-view
title: Enhance the read-only past-workout detail view
status: archived
created: 2026-07-27
updated: 2026-07-29
archived_at: 2026-07-29T10:27:20Z
---

## Notes

Roadmap slice S-06 (Stream B, PRD ref FR-011). The read-only SessionPage at
`/workouts/:id` already renders the full detail of a finished workout (all
exercises, sets, and values), and S-04's HistoryPage rows already link there —
so FR-011's core outcome is substantially met.

Scope for this change (agreed): a **light enhancement** of the existing
read-only view rather than a dedicated new page. Add:
- a "back to history" navigation affordance,
- the finished date,
- a small summary (e.g. total exercises / total sets, and total volume where it
  makes sense).

Explicitly NOT building a separate detail page or duplicating SessionPage.
