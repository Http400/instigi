---
change_id: workout-service-scaffold
title: Scaffold new workout data service with tables and JWT verification
status: plan_reviewed
created: 2026-07-02
updated: 2026-07-03
archived_at: null
---

## Notes

F-01 from context/foundation/roadmap.md. Stand up a new dedicated workout service alongside auth-service, connected to its own Postgres tables, able to verify auth-service-issued JWTs, and reachable through the existing container/compose wiring. Keep schema minimal — no workout tables prebuilt beyond what S-01 needs. Unlocks S-01–S-04.
