---
change_id: testing-session-integrity-domain-rule
title: Test rollout Phase 1 — training-service session integrity and metric domain rule
status: implementing
created: 2026-08-21
updated: 2026-08-21
archived_at: null
---

## Notes

Rollout Phase 1 of context/foundation/test-plan.md: "Session integrity & domain rule".
Risks covered: #1 (a set persists violating the per-exercise metric rule), #3 (a completed workout is lost or partially saved on Finish), #5 (an empty session is saved).
Test types planned: integration (Vitest + supertest against the training-service app export, db mocked).
Risk response intent:
- #1: prove the server rejects a set with an undeclared metric, a missing required metric, or a disallowed entry type, and accepts a valid one.
- #3: prove that after Finish the session and all its entries are retrievable together, and a mid-save failure leaves no half-written workout.
- #5: prove the server rejects saving a session with zero exercises or zero sets.
