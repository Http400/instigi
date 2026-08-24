We are adding an E2E test for this risk from
`context/foundation/test-plan.md`:

Risk #6: The end-to-end loop (start → add exercises → log sets → finish →
appears in history) breaks at a seam even though each unit passes.

Research anchor:

`context/foundation/test-plan.md` rollout Phase 4, “Critical-path e2e & gate.”

Business scenario:

After a user starts and names a workout, adds Bench Press, logs a set, and
finishes, the uniquely named workout appears in history and reopening it shows
the same exercise and metric values. If any UI, routing, API, or persistence seam
breaks, this test must fail.

Real boundaries (do not mock):

Storage-state authentication, React routing and UI state, RTK Query requests,
auth service, training service, and Postgres.

Mocked boundaries:

None. This flow has no expensive or non-deterministic external API.

Write one Playwright test following `seed.spec.ts` and `e2e/AGENTS.md`. Use the
authenticated `/e2e/sessions/:id` endpoint only for teardown-before-setup and
`finally` cleanup. Assert the persisted workout title, exercise count, exercise,
and set values after reopening history.

This catches a regression where the browser flow appears to finish but the
completed workout or its logged set fails to persist across application seams.
