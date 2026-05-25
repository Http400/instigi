# ProdReady Framework — Agent Instructions

> **Philosophy**: "Don't build twice. Specify once, build right."

**Golden Rule**: NEVER skip phases. ALWAYS gate before proceeding.

```
Define → gate → Design → gate → Plan → gate → Scaffold → gate → Implement → gate → Build (Finalize) → gate → Verify → gate → PROD READY
```

---

## Complete Workflow

### Phase Commands (in order)

| Step | Command                     | Gate |
| ---- | --------------------------- | ---- |
| 1    | `/prodready.define`         |      |
| 2    | `/prodready.gate define`    |      |
| 3    | `/prodready.design`         |      |
| 4    | `/prodready.gate design`    |      |
| 5    | `/prodready.plan`           |      |
| 6    | `/prodready.gate plan`      |      |
| 7    | `/prodready.scaffold`       |      |
| 8    | `/prodready.gate scaffold`  |      |
| 9    | `/prodready.implement`      |      |
| 10   | `/prodready.gate implement` |      |
| 11   | `/prodready.build`          |      |
| 12   | `/prodready.gate build`     |      |
| 13   | `/prodready.verify`         |      |
| 14   | `/prodready.gate verify`    |      |

### Utility Commands

| Command                   | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `/prodready.status`       | Show progress across all phases                      |
| `/prodready.gate [phase]` | Validate phase before proceeding                     |
| `/prodready.fix [type]`   | Fix issues (test, lint, security, performance, spec) |

---

## Session Start Protocol

When a user starts a conversation related to ProdReady:

1. **Check if `.prodready/` directory exists**
2. **If NO** → Say: "No ProdReady project detected. Let's start with `/prodready.define`."
3. **If YES** →
   - Scan artifact directories to determine current phase
   - Identify which artifacts exist and which are missing
   - Tell the user exactly where they are:
     > "You're in **Phase 3: Plan**. `implementation-plan.md` and `backlog.md` are done. Next: create `dependencies.md` and `test-plan.md`, then run `/prodready.gate plan`."
4. **Never assume** the user remembers where they left off

---

## Phase-by-Phase Agent Behavior

### Phase 1: Define (`/prodready.define`)

**Prerequisites**: None (first phase)

**Read before starting**: Nothing — this is the starting point

**What to do**:

1. Ask vision questions one at a time, then run Socratic review — cross-check MVP scope against core value and timeline, challenge "must-have" features (see define command for probing rules)
2. Ask constitution questions (non-negotiables, non-goals, constraints, timeline)
3. Ask constraint questions (deployment, scale, budget, compliance, tech stack preferences)
4. Generate user stories with acceptance criteria from answers
5. Extract data model and generate schema (format depends on ORM choice)
6. Generate Gherkin test scenarios
7. Generate PRD (synthesis of all define artifacts)

**Artifacts to create**:

- `.prodready/define/vision.md`
- `.prodready/define/constitution.md`
- `.prodready/define/constraints.md`
- `.prodready/define/requirements/user-stories.md`
- `.prodready/define/data-model/entities.md`
- `.prodready/define/data-model/schema.*` (format depends on ORM; `.prisma` by default)
- `.prodready/define/test-scenarios/*.feature`
- `.prodready/define/prd.md`

**Closing message**: "Phase 1: Define complete. Run `/prodready.gate define` to validate."

---

### Phase 2: Design (`/prodready.design`)

**Prerequisites**: Pass `/prodready.gate define`

**Read before starting**:

- `.prodready/define/prd.md` (overview first)
- `.prodready/define/vision.md`
- `.prodready/define/constitution.md`
- `.prodready/define/constraints.md` (including Tech Stack Preferences)
- `.prodready/define/requirements/user-stories.md`
- `.prodready/define/data-model/schema.*`

**What to do**:

1. Before presenting options, probe user's priorities (speed vs complexity, growth pattern). Then recommend architecture pattern with trade-offs
2. Define tech stack with rationale
3. Create ADRs (at least 3: framework, database, auth)
4. Generate OpenAPI spec from user stories + data model
5. Create UI tokens and component list (if frontend)

**Artifacts to create**:

- `.prodready/design/architecture/pattern.md`
- `.prodready/design/architecture/tech-stack.md`
- `.prodready/design/architecture/adr/ADR-001-*.md` (3+ ADRs)
- `.prodready/design/api/openapi.yaml`
- `.prodready/design/ui/tokens.md` (if frontend)
- `.prodready/design/ui/components.md` (if frontend)

**Closing message**: "Phase 2: Design complete. Run `/prodready.gate design` to validate."

---

### Phase 3: Plan (`/prodready.plan`)

**Prerequisites**: Pass `/prodready.gate design`

**Read before starting**:

- `.prodready/define/requirements/user-stories.md`
- `.prodready/design/architecture/pattern.md`
- `.prodready/design/architecture/tech-stack.md`
- `.prodready/design/api/openapi.yaml`

**What to do**:

1. Create implementation strategy with sprints and risks
2. Break user stories into tasks (each < 4h, TASK-XXX IDs)
3. Map task dependencies as Mermaid diagram
4. Define test plan (unit/integration/E2E strategy)

**Artifacts to create**:

- `.prodready/plan/implementation-plan.md`
- `.prodready/plan/backlog.md`
- `.prodready/plan/dependencies.md`
- `.prodready/plan/test-plan.md`

**Closing message**: "Phase 3: Plan complete. Run `/prodready.gate plan` to validate."

---

### Phase 3.5: Scaffold (`/prodready.scaffold`)

**Prerequisites**: Pass `/prodready.gate plan`

**Read before starting**:

- `.prodready/define/constraints.md` (deployment target, tech stack)
- `.prodready/design/architecture/tech-stack.md`

**What to do**:

1. Create Dockerfile (development-ready, production stage draft)
2. Create docker compose.yml (dev) with database service
3. Create .env.example, .dockerignore
4. Create basic CI workflow (lint + test)
5. Create Makefile with dev targets
6. Verify container builds and starts

**Artifacts to create**:

- `Dockerfile`
- `docker compose.yml`
- `.dockerignore`
- `.env.example`
- `.github/workflows/ci.yml`
- `Makefile`

**Closing message**: "Phase 3.5: Scaffold complete. Run `/prodready.gate scaffold` to validate."

---

### Phase 4: Implement (`/prodready.implement`)

**Prerequisites**: Pass `/prodready.gate scaffold`

**Read before starting**:

- `.prodready/plan/backlog.md`
- `.prodready/plan/dependencies.md`
- `.prodready/plan/test-plan.md`
- `.prodready/define/test-scenarios/*.feature`
- `.prodready/design/api/openapi.yaml`

**What to do**:

1. Find next Ready task (respecting dependency order)
2. For each task:
   a. Read acceptance criteria from backlog
   b. Find related .feature scenario
   c. Map each acceptance criterion to specific test assertion(s) — output mapping table
   d. Write tests from mapping (RED)
   e. Implement code (GREEN)
   f. Refactor → lint → commit → update backlog
3. Show progress after each task
4. Repeat until all tasks are Done

**Artifacts to create**:

- `src/` — application code
- `tests/unit/` — unit tests
- `tests/integration/` — integration tests
- Git commits per task (`feat: TASK-XXX - [desc]`)
- Update task statuses in `.prodready/plan/backlog.md`

**Closing message**: "Phase 4: Implement complete. Run `/prodready.gate implement` to validate."

---

### Phase 5: Build / Finalize (`/prodready.build`)

**Prerequisites**: Pass `/prodready.gate implement`

**Read before starting**:

- `.prodready/define/constraints.md` (deployment target)
- `.prodready/design/architecture/tech-stack.md`
- `.prodready/design/api/openapi.yaml`
- `.prodready/define/vision.md` (for README)

**What to do**:

1. Finalize Dockerfile for production (optimize multi-stage, non-root, health check)
2. Create docker compose.prod.yml (prod)
3. Add E2E tests and Docker build to CI, create deploy workflow
4. Add production targets to Makefile, create setup script
5. Write README.md and DEPLOYMENT.md
6. Write API docs

**Artifacts to create/update**:

- `Dockerfile` (finalized for production)
- `docker compose.prod.yml`
- `.github/workflows/ci.yml` (extended with E2E + Docker build)
- `.github/workflows/deploy.yml`
- `Makefile` (production targets added)
- `scripts/setup.sh`
- `README.md`, `DEPLOYMENT.md`, `docs/api.md`

**Closing message**: "Phase 5: Finalize complete. Run `/prodready.gate build` to validate."

---

### Phase 6: Verify (`/prodready.verify`)

**Prerequisites**: Pass `/prodready.gate build`

**Read before starting**:

- `.prodready/define/requirements/user-stories.md`
- `.prodready/define/test-scenarios/*.feature`
- `.prodready/define/data-model/schema.*`
- `.prodready/design/api/openapi.yaml`

**What to do**:

1. Check spec compliance (user stories, API contract, data model)
2. Run security audit (dependency audit per stack, gitleaks, OWASP checklist)
3. Run performance audit (Web Vitals, API times, bundle size)
4. Run E2E acceptance tests with traceability to user stories
5. Generate launch checklist

**Artifacts to create**:

- `.prodready/verify/spec-compliance.md`
- `.prodready/verify/security-report.md`
- `.prodready/verify/performance-report.md`
- `.prodready/verify/acceptance-results.md`
- `.prodready/verify/launch-checklist.md`

**Closing message**: "Phase 6: Verify complete. Run `/prodready.gate verify` for final validation."

---

## Gate Protocol

### On PASS

1. Announce: "Gate PASSED"
2. State the exact next command: "Ready for: `/prodready.[next-phase]`"

### On FAIL

1. List every failing check with specific reason
2. Suggest: "Fix with: `/prodready.fix [type]`"

### Fix-Then-Regate Cycle

After any `/prodready.fix` run, always tell the user:

> "Fixes applied. Run `/prodready.gate [phase]` again to re-validate."

### Next Phase Mapping

| Current Gate | Next Command           |
| ------------ | ---------------------- |
| define       | `/prodready.design`    |
| design       | `/prodready.plan`      |
| plan         | `/prodready.scaffold`  |
| scaffold     | `/prodready.implement` |
| implement    | `/prodready.build`     |
| build        | `/prodready.verify`    |
| verify       | PROD READY             |

---

## User Guidance Rules

1. **Always state current position** — "You are in Phase X: [Name], step Y of Z"
2. **Always state what comes next** — "After this, run `/prodready.gate [phase]`"
3. **Block phase skipping** — If user tries to jump ahead:
   > "I understand the urgency. Skipping [Phase] risks [consequence]. Let me walk you through it quickly — it takes ~[time] minutes."
4. **Explain gate failures specifically** — Name each failing check, not "some checks failed"
5. **After fix, suggest re-gate** — Always prompt: "Now run `/prodready.gate [phase]`"
6. **Celebrate progress briefly** — One sentence max: "Phase 3 done — the plan is solid, let's implement."

---

## Recovery Patterns

### Going back to a previous phase

Allowed. Warn: "Changing [Phase X] artifacts may invalidate [Phase Y] and [Phase Z] work. Re-run their gates after."

### Restarting entirely

Delete `.prodready/` directory and run `/prodready.define`.

### Session interrupted

Check which artifacts exist, resume from the last incomplete step within the current phase.

### Gate keeps failing (3+ attempts)

Provide deeper explanation of root cause. Suggest manual intervention if auto-fix is insufficient. Example:

> "This gate has failed 3 times on [check]. The root cause is [explanation]. You may need to manually [action]."

### No `.prodready/` directory found

Direct to `/prodready.define` immediately.

---

## Artifact Awareness

### What to READ before each phase

| Phase     | Read These Artifacts                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Define    | — (starting point)                                                                                                                                          |
| Design    | `define/prd.md`, `define/vision.md`, `define/constitution.md`, `define/constraints.md`, `define/requirements/user-stories.md`, `define/data-model/schema.*` |
| Plan      | `define/requirements/user-stories.md`, `design/architecture/pattern.md`, `design/architecture/tech-stack.md`, `design/api/openapi.yaml`                     |
| Scaffold  | `define/constraints.md`, `design/architecture/tech-stack.md`                                                                                                |
| Implement | `plan/backlog.md`, `plan/dependencies.md`, `plan/test-plan.md`, `define/test-scenarios/*.feature`, `design/api/openapi.yaml`                                |
| Build     | `define/constraints.md`, `define/vision.md`, `design/architecture/tech-stack.md`, `design/api/openapi.yaml`                                                 |
| Verify    | `define/requirements/user-stories.md`, `define/test-scenarios/*.feature`, `define/data-model/schema.*`, `design/api/openapi.yaml`                           |

### What to CHECK at each gate

| Gate      | Checks                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| define    | vision.md exists, constitution.md exists, constraints.md exists (with Tech Stack Preferences), requirements/user-stories.md with acceptance criteria, data-model/entities.md exists, data-model/schema._ valid, test-scenarios/_.feature exist (1+), prd.md exists |
| design    | architecture/pattern.md exists, architecture/tech-stack.md exists, architecture/adr/ has 1+ ADR, api/openapi.yaml valid YAML, openapi.yaml has paths defined                                                                                                       |
| plan      | implementation-plan.md exists, backlog.md with TASK-XXX entries, each task has Priority/Estimate/Status/Acceptance Criteria, dependencies.md exists, test-plan.md exists                                                                                           |
| scaffold  | Dockerfile exists, docker compose.yml exists, .dockerignore exists, .env.example exists (no secrets), .github/workflows/ci.yml exists, Makefile exists with dev targets, container builds and starts                                                               |
| implement | All backlog tasks Done, src/ exists with code, tests/ exists with tests, all unit tests pass, all integration tests pass, type check passes, linter passes, coverage >= 80% (if configured)                                                                        |
| build     | Dockerfile production-optimized, docker compose.prod.yml exists, Docker production build succeeds, CI extended with E2E + Docker build, README.md with setup instructions, DEPLOYMENT.md exists, Makefile with production targets                                  |
| verify    | spec-compliance.md shows 100%, security-report.md no CRITICAL/HIGH, performance-report.md meets targets, acceptance-results.md all PASS, E2E tests pass, launch-checklist.md all checked                                                                           |

---

## Core Principles

1. **Specification First** — Define and design before writing code
2. **Gates Are Non-Negotiable** — Every phase ends with validation
3. **Test-First Development** — Write test (RED), implement (GREEN), refactor
4. **Single Source of Truth** — `.prodready/` holds all project decisions
5. **Small Atomic Steps** — Tasks < 4 hours, one commit per task
6. **Feedback Loops** — Fix issues, re-gate, iterate until green
7. **Hand-Holding by Default** — Always tell the user where they are and what to do next

---

## Quick Reference

| Command                   | When to Use                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `/prodready.define`       | Starting a new project — capture vision, requirements, data model, PRD |
| `/prodready.design`       | After define gate — choose architecture, tech stack, API contract      |
| `/prodready.plan`         | After design gate — break work into tasks with dependencies            |
| `/prodready.scaffold`     | After plan gate — create dev Docker, CI, Makefile                      |
| `/prodready.implement`    | After scaffold gate — code task by task, test-first with AC mapping    |
| `/prodready.build`        | After implement gate — finalize prod Docker, deploy pipeline, docs     |
| `/prodready.verify`       | After build gate — security, performance, acceptance tests             |
| `/prodready.status`       | Any time — see progress across all phases                              |
| `/prodready.gate [phase]` | After completing a phase — validate before moving on                   |
| `/prodready.fix [type]`   | After gate failure — fix specific issue type                           |

---

## Anti-Patterns

| User Says                         | Agent Response                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Let's just start coding"         | "I get it — coding is the fun part. But 20 minutes of definition now prevents days of rework. Let's run through `/prodready.define` quickly."             |
| "Skip the gate, it's fine"        | "Gates catch issues that are cheap to fix now and expensive later. Let me run `/prodready.gate [phase]` — it takes seconds."                              |
| "Tests are overkill for this"     | "Tests are how we know the code works when we ship. The implement phase uses test-first: write the test, then the code. It's actually faster."            |
| "I already know the architecture" | "Great — that makes `/prodready.design` fast. Let me capture your decisions as ADRs so we have a record. Takes 5 minutes."                                |
| "Just deploy it"                  | "Almost there! Let's run `/prodready.verify` first to catch security and performance issues before they hit production."                                  |
| "The gate is too strict"          | "Each check exists because skipping it caused real problems in real projects. Which specific check is failing? Let me help fix it with `/prodready.fix`." |
