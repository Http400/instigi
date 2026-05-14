# ProdReady Gate

Validate completion of a specific phase before proceeding to the next.

**Usage**: `/prodready.gate [phase]`

**Arguments**: `$ARGUMENTS` (one of: define, design, plan, scaffold, implement, build, verify)

## Instructions

Parse the phase argument and run the appropriate validation checks.

### Phase: DEFINE

Check existence and validity of artifacts in `.prodready/define/`:

```
Quality Gate: DEFINE
═══════════════════════════

[ ] vision.md exists and has content
[ ] constitution.md exists and has content
[ ] constraints.md exists and has content (including Tech Stack Preferences)
[ ] requirements/user-stories.md exists with acceptance criteria
[ ] data-model/entities.md exists
[ ] data-model/schema.* exists and is valid (validation depends on ORM: npx prisma validate, SQL syntax check, etc.)
[ ] test-scenarios/*.feature files exist (at least 1)
[ ] prd.md exists and is a coherent summary (not just copy of other files)

Result: [PASSED ✓ | FAILED ✗]
```

### Phase: DESIGN

Check artifacts in `.prodready/design/`:

```
Quality Gate: DESIGN
═══════════════════════════

[ ] architecture/pattern.md exists
[ ] architecture/tech-stack.md exists
[ ] architecture/adr/ has at least 1 ADR file
[ ] api/openapi.yaml exists and is valid YAML
[ ] openapi.yaml has paths defined

Result: [PASSED ✓ | FAILED ✗]
```

### Phase: PLAN

Check artifacts in `.prodready/plan/`:

```
Quality Gate: PLAN
═══════════════════════════

[ ] implementation-plan.md exists
[ ] backlog.md exists with TASK-XXX entries
[ ] Each task has Priority, Estimate, Status, Acceptance Criteria
[ ] dependencies.mmd exists (Mermaid diagram)
[ ] test-plan.md exists

Result: [PASSED ✓ | FAILED ✗]
```

### Phase: SCAFFOLD

Check development infrastructure:

```
Quality Gate: SCAFFOLD
═══════════════════════════

[ ] Dockerfile exists
[ ] docker compose.yml exists
[ ] .dockerignore exists
[ ] .env.example exists (no real secrets)
[ ] .github/workflows/ci.yml exists
[ ] Makefile exists with dev targets
[ ] docker compose up builds successfully
[ ] Application starts in container

Result: [PASSED ✓ | FAILED ✗]
```

Run: `docker compose up --build -d && docker compose ps`

### Phase: IMPLEMENT

Validate code implementation:

```
Quality Gate: IMPLEMENT
═══════════════════════════

[ ] All tasks in backlog.md marked as Done
[ ] src/ directory exists with code (or equivalent for chosen framework)
[ ] tests/ directory exists with tests
[ ] All unit tests pass
[ ] All integration tests pass
[ ] Type check passes (language-specific: npx tsc --noEmit, mypy, etc.)
[ ] Linter passes (npm run lint, ruff check, etc.)
[ ] Code coverage >= 80% (if configured)

Result: [PASSED ✓ | FAILED ✗]
```

Run quality checks per tech-stack.md:
```bash
# Default (TypeScript): npx tsc --noEmit && npm run lint && npm test
# Python: mypy . && ruff check . && pytest
# Adapt commands to chosen stack
```

### Phase: BUILD

Validate infrastructure:

```
Quality Gate: BUILD
═══════════════════════════

[ ] Dockerfile production stage optimized (non-root user, health check, minimal image)
[ ] docker compose.prod.yml exists
[ ] Docker production build succeeds (docker build -t test-build .)
[ ] .github/workflows/deploy.yml exists (if applicable)
[ ] CI extended with E2E and Docker build jobs
[ ] README.md exists with setup instructions
[ ] DEPLOYMENT.md exists
[ ] Makefile has production targets (prod-up, prod-down, prod-logs)

Result: [PASSED ✓ | FAILED ✗]
```

Run: `docker build -t prodready-gate-test . 2>&1`

### Phase: VERIFY

Final production readiness check:

```
Quality Gate: VERIFY
═══════════════════════════

[ ] .prodready/verify/spec-compliance.md shows 100%
[ ] .prodready/verify/security-report.md has no CRITICAL/HIGH issues
[ ] .prodready/verify/performance-report.md meets targets
[ ] .prodready/verify/acceptance-results.md shows all PASS
[ ] E2E tests pass (npm run test:e2e or equivalent)
[ ] .prodready/verify/launch-checklist.md all items checked

Result: [PASSED ✓ | FAILED ✗]
```

## Output Format

### On SUCCESS:

```
Quality Gate: [PHASE]
═══════════════════════════

✓ [check 1]
✓ [check 2]
...

Result: PASSED ✓
➤ Ready for: /prodready.[next-phase]
```

### On FAILURE:

```
Quality Gate: [PHASE]
═══════════════════════════

✓ [passing check]
✗ [failing check] - [reason]
...

Result: FAILED ✗ (X issues)
➤ Fix with: /prodready.fix [suggested-type]
```

## Next Phase Mapping

| Current | Next Command |
|---------|--------------|
| define | `/prodready.design` |
| design | `/prodready.plan` |
| plan | `/prodready.scaffold` |
| scaffold | `/prodready.implement` |
| implement | `/prodready.build` |
| build | `/prodready.verify` |
| verify | PROD READY |

## Final Gate (verify) Success Message

```
Quality Gate: VERIFY
═══════════════════════════

✓ Spec compliance 100%
✓ Security scan passed
✓ Performance targets met
✓ E2E tests passed

Result: PASSED ✓

🎉 PROD READY

Deploy with:
  docker compose -f docker compose.prod.yml up -d
```
