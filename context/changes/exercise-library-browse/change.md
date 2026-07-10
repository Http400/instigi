---
change_id: exercise-library-browse
title: Browse the predefined exercise library (search + category filter) served by training-service
status: planned
created: 2026-07-10
updated: 2026-07-10
archived_at: null
---

## Notes

S-01 from context/foundation/roadmap.md. First user-visible workout slice. Serve a predefined, metric-configured exercise library from the F-01 `training-service` and wire the already-built F-02 exercises page (`apps/web-app`) to it: signed-in users browse the seeded list, search by name, and filter by category, with loading / empty / error states.

Prerequisites: F-01 (workout-service-scaffold) and F-02 (exercises-page-layout) — both archived. Unlocks S-02–S-04.

Key decisions (see plan-brief.md):
- Exercise ownership: `ExerciseDefinition.userId` is nullable — `null` = global predefined (available to all), set = user-owned (listed only for its creator). This slice seeds and browses global exercises + the caller's own; user-created exercises are a later slice (the "New exercise" button stays disabled).
- Server-side search + category filtering via query params.
- Lowercase enums (`strength`/`reps`/…) shared via `@instigi/types`; runtime `metricCatalog` (labels/validation) shared via `@instigi/utils`.
- Swimming folds into `cardio` per the data model; the standalone "Swimming" chip and the status select are dropped from the toolbar.
- Seed = the 8-exercise set from context/foundation/data-model.md verbatim.
