# ProdReady Design (Phase 2: HOW)

Design HOW the application will work. This phase defines architecture, tech stack, and API contracts.

**Estimated time**: ~15 minutes

**Prerequisites**: Complete `/prodready.define` and pass `/prodready.gate define`

## Instructions

Read the define phase artifacts and design the technical architecture.

### Prerequisites Check

1. Verify `.prodready/define/` exists with:
   - vision.md
   - constitution.md
   - constraints.md
   - requirements/user-stories.md
   - data-model/schema.* (any schema file)
   - prd.md

   Read `prd.md` first for a quick project overview, then dive into specific artifacts as needed.

2. Create design directory:
   ```
   .prodready/design/
   ├── architecture/
   │   └── adr/
   ├── api/
   └── ui/ (if frontend)
   ```

---

## Step 0.5: Challenge Assumptions Before Designing

Before presenting architecture options, probe the user's understanding of their own constraints:

- "What's more important for v1.0: shipping fast or managing complexity long-term?"
- "How do you expect traffic to grow — gradually or in spikes?"
- "What's your team's strongest technical skill — is the stack leveraging that?"

These questions often reveal that constraints from Define have shifted or were aspirational rather than real.

**Max 2-3 questions. Move on after one round of answers.**

---

## Step 1: Select Architecture Pattern

Based on constraints and scale requirements, recommend an architecture pattern.

### Analysis

Read from `.prodready/define/constraints.md`:
- Deployment target
- Scale expectations
- Team size

### Pattern Options

Present options with trade-offs:

| Pattern | Best For | Trade-offs |
|---------|----------|------------|
| **Monolith** | MVP, small team, fast iteration | Scaling limits, coupled deployment |
| **Modular Monolith** | Medium complexity, future split | More upfront structure |
| **Microservices** | Large team, high scale | Complexity, ops overhead |
| **Serverless** | Variable traffic, low ops | Cold starts, vendor lock-in |

Ask user to confirm or choose pattern, then generate:

`.prodready/design/architecture/pattern.md`:

```markdown
# Architecture Pattern

## Selected Pattern: [Pattern Name]

## Rationale
Based on:
- Deployment: [from constraints]
- Scale: [from constraints]
- Team: [from constraints]

[Pattern] was selected because:
- [Reason 1]
- [Reason 2]

## Structure

```
[ASCII or description of architecture]
```

## Key Decisions
- [Decision 1]
- [Decision 2]

## Future Considerations
- [If/when to change pattern]
```

---

## Step 2: Define Tech Stack

### Read Stack Preferences

First, read `.prodready/define/constraints.md` → "Tech Stack Preferences" section.

- If the user specified preferences → use those as the starting point, validate against project needs, and fill in any gaps
- If "to be decided" → recommend based on constraints (deployment, scale, team, budget)
- In either case, present the full stack for user confirmation before generating

**Probe tech stack preferences:**
If the user specified a stack, don't just accept it — ask ONE question:
> "Why [framework/database]? What specific problem does it solve for THIS project, vs being your default choice?"

If the answer is "I know it well" — that's valid. If "it's just what everyone uses" — present the trade-off with an alternative that better fits the constraints.

### Generate Tech Stack Document

`.prodready/design/architecture/tech-stack.md`:

```markdown
# Tech Stack

## Core

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | [from constraints or recommended] | [rationale] |
| Runtime | [appropriate runtime] | [rationale] |
| Framework | [from constraints or recommended] | [rationale] |
| Database | [from constraints or recommended] | [rationale] |
| ORM | [from constraints or recommended, or "none"] | [rationale] |

## Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Container | Docker | Portability, consistency |
| Reverse Proxy | [Traefik/Nginx/Caddy] | SSL, routing |
| CI/CD | GitHub Actions | Integration, free tier |

## Development

| Tool | Purpose |
|------|---------|
| [Linter for chosen language] | Linting |
| [Formatter for chosen language] | Formatting |
| [Unit test framework] | Unit/Integration testing |
| [E2E test framework] | E2E testing |
| [Git hooks tool] | Git hooks |

## Versions

[JSON block with actual chosen versions]

## Authentication

- Strategy: [JWT/Session/OAuth]
- Library: [appropriate for framework]
- Storage: [Cookie/LocalStorage details]

## Monitoring (Optional)

- Logging: [appropriate for stack]
- Error tracking: [Sentry/none]
- Analytics: [Plausible/none]
```

> **Default Example** (when no preferences specified — Next.js 15 + TypeScript + Prisma + PostgreSQL):
>
> | Layer | Technology | Rationale |
> |-------|------------|-----------|
> | Language | TypeScript | Type safety, ecosystem |
> | Runtime | Node.js 20 LTS | Stability, support |
> | Framework | Next.js 15 | App Router, RSC, API routes |
> | Database | PostgreSQL | Relational, robust, free |
> | ORM | Prisma | Type-safe, migrations |
>
> Development: ESLint, Prettier, Vitest, Playwright, Husky
>
> Versions: `{ "node": "20.x", "typescript": "5.x", "next": "15.x", "prisma": "5.x", "vitest": "2.x", "playwright": "1.x" }`

---

## Step 3: Create ADRs

For significant architectural decisions, create Architecture Decision Records.

### Required ADRs

Generate at least these ADRs:

1. **ADR-001: Framework Selection**
2. **ADR-002: Database Choice**
3. **ADR-003: Authentication Strategy**

### ADR Template

`.prodready/design/architecture/adr/ADR-001-framework-selection.md`:

```markdown
# ADR-001: Framework Selection

## Status
Accepted

## Date
[Current date]

## Context
[Why this decision was needed]

## Decision
We will use [Framework] because:
- [Reason 1]
- [Reason 2]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Trade-off 1]
- [Trade-off 2]

### Risks
- [Risk and mitigation]

## Alternatives Considered
1. [Alternative 1]: Rejected because [reason]
2. [Alternative 2]: Rejected because [reason]
```

---

## Step 4: Generate OpenAPI Specification

Based on user stories, generate API contract.

### Process

1. Read user stories from `.prodready/define/requirements/user-stories.md`
2. Read data model from `.prodready/define/data-model/schema.*` (Prisma, SQL, or other schema file)
3. Generate RESTful API endpoints

### Generate OpenAPI

`.prodready/design/api/openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: [Project Name] API
  version: 1.0.0
  description: [From vision.md]

servers:
  - url: http://localhost:3000/api
    description: Development
  - url: https://api.example.com
    description: Production

tags:
  - name: auth
    description: Authentication endpoints
  - name: [resource]
    description: [Resource] management

paths:
  /auth/register:
    post:
      tags: [auth]
      summary: Register new user
      operationId: registerUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'

  /auth/login:
    post:
      tags: [auth]
      summary: Login user
      # ... similar structure

  /[resource]:
    get:
      tags: [[resource]]
      summary: List [resources]
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
      responses:
        '200':
          description: List of [resources]
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]List'

    post:
      tags: [[resource]]
      summary: Create [resource]
      security:
        - bearerAuth: []
      # ...

  /[resource]/{id}:
    get:
      # ...
    put:
      # ...
    delete:
      # ...

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time
      required: [id, email, createdAt]

    RegisterRequest:
      type: object
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
      required: [email, password]

    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
      required: [code, message]

    # Add schemas for each entity from data model

  parameters:
    Page:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1

    Limit:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Conflict:
      description: Resource already exists
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

---

## Step 5: UI Design (If Frontend)

If the project includes a frontend, create basic design tokens and wireframes.

### Design Tokens

`.prodready/design/ui/tokens.md`:

```markdown
# Design Tokens

## Colors

### Brand
- primary: #3B82F6
- primary-dark: #2563EB
- secondary: #10B981

### Semantic
- success: #22C55E
- warning: #F59E0B
- error: #EF4444
- info: #3B82F6

### Neutral
- background: #FFFFFF
- surface: #F9FAFB
- text-primary: #111827
- text-secondary: #6B7280
- border: #E5E7EB

## Typography

- font-family: Inter, system-ui, sans-serif
- font-size-xs: 0.75rem
- font-size-sm: 0.875rem
- font-size-base: 1rem
- font-size-lg: 1.125rem
- font-size-xl: 1.25rem
- font-size-2xl: 1.5rem

## Spacing

- spacing-1: 0.25rem
- spacing-2: 0.5rem
- spacing-3: 0.75rem
- spacing-4: 1rem
- spacing-6: 1.5rem
- spacing-8: 2rem

## Border Radius

- radius-sm: 0.25rem
- radius-md: 0.375rem
- radius-lg: 0.5rem
- radius-full: 9999px

## Shadows

- shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
- shadow-md: 0 4px 6px rgba(0,0,0,0.1)
- shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
```

### Component List

`.prodready/design/ui/components.md`:

```markdown
# UI Components

## Primitives
- [ ] Button (primary, secondary, ghost, danger)
- [ ] Input (text, email, password)
- [ ] Select
- [ ] Checkbox
- [ ] Radio

## Composite
- [ ] Form
- [ ] Card
- [ ] Modal
- [ ] Toast
- [ ] Table

## Layout
- [ ] Header
- [ ] Sidebar
- [ ] Footer
- [ ] Container
```

---

## Final Output

```
╔═══════════════════════════════════════════════════════════╗
║              Phase 2: DESIGN Complete                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Created:                                                 ║
║  ├── .prodready/design/architecture/pattern.md           ║
║  ├── .prodready/design/architecture/tech-stack.md        ║
║  ├── .prodready/design/architecture/adr/ADR-001-*.md     ║
║  ├── .prodready/design/architecture/adr/ADR-002-*.md     ║
║  ├── .prodready/design/architecture/adr/ADR-003-*.md     ║
║  ├── .prodready/design/api/openapi.yaml                  ║
║  └── .prodready/design/ui/ (if applicable)               ║
║                                                           ║
║  Summary:                                                 ║
║  • Pattern: [Modular Monolith]                           ║
║  • Stack: [Next.js + PostgreSQL + Prisma]                ║
║  • API Endpoints: [N] defined                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

➤ Next: /prodready.gate design
```
