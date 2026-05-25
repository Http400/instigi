---
project: Instigi
researched_at: 2026-05-25T12:00:54+02:00
recommended_platform: Railway
runner_up: Render
context_type: mvp
tech_stack:
  language: TypeScript (strict)
  framework: React 19 + Express 5 + Prisma 7
  runtime: Node.js (Docker containers)
  database: PostgreSQL 17
---

## Recommendation

**Deploy on Railway.**

Railway is the strongest fit for Instigi's Docker-based Turborepo monorepo at MVP scale. It runs all three services (Express 5 backend, two Nginx-served SPAs) as persistent Docker containers on its own bare-metal hardware ("Railway Metal"), provides co-located PostgreSQL via private networking, and ships the most complete MCP integration of any container-native platform — bundled directly into the Railway CLI. At pre-launch traffic levels, all resource usage fits within the Hobby plan's $5/month included credit, making it the lowest-cost viable option. The pnpm/Turborepo monorepo auto-import detects workspaces and stages services, and docs are available as `llms.txt` and per-page Markdown endpoints.

---

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Notes |
|---|---|---|---|---|---|---|
| **Railway** | Partial | Pass | Pass | Pass | Pass | No CLI rollback (dashboard-only) |
| **Render** | Pass | Pass | Pass | Pass | Pass | Full 5/5; rollback via REST API |
| **Fly.io** | Pass | Pass | Partial | Pass | Partial | No llms.txt; MCP experimental |
| OVH VPS | Partial | Fail | Partial | Partial | Fail | ⚠️ Raw unmanaged VM; no deploy API; no MCP |
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | ⚠️ Architecture mismatch — no Docker/persistent process |
| Vercel | Pass | Pass | Partial | Pass | Pass | ⚠️ Serverless only; no persistent containers |
| Netlify | Partial | Pass | Fail | Partial | Pass | ⚠️ Lambda-backed; no persistent process; no llms.txt |

**Hard constraint applied:** The project runs Express 5 as a persistent Docker container. Cloudflare Workers (V8 isolate, 128 MB, no persistent TCP server), Vercel (serverless functions only), and Netlify (AWS Lambda-backed) all require significant re-architecture to host the Express backend and are excluded from the shortlist.

OVH VPS runs Docker natively and requires zero architectural changes — but it is a raw unmanaged VM. The developer (or agent) is solely responsible for SSL, OS patching, firewall, monitoring, database backups, and deployment scripting. It scores 0 Pass / 3 Partial / 2 Fail on the agent-friendly criteria, making it the lowest-ranked option for agent-driven MVP development.

**Soft weights applied from interview:**
- Cost vs DX (no preference) → neutral
- Platform familiarity (none) → no tie-breaking
- Single region fine → Cloudflare's global edge advantage irrelevant
- Co-location preferred → boosts Railway (private-network Postgres) and Render (fully managed Postgres with PITR)

---

### Shortlisted Platforms

#### 1. Railway (Recommended)

Railway's pnpm/Turborepo workspace auto-import stages all three services automatically, inferring build commands and watch paths. Docker containers run as persistent always-on services; Postgres is provisioned in one action and connected via internal DNS (`postgres.railway.internal`) with `DATABASE_URL` auto-injected. The MCP server is bundled into the CLI (`railway mcp install`) with a remote hosted endpoint at `mcp.railway.com`, and docs expose `llms.txt` + per-page `.md` endpoints. At pre-launch scale, all compute costs fit within the Hobby plan's $5/month credit — effective cost is $5/month flat. The main weakness is unmanaged PostgreSQL (no auto-failover, no built-in connection pooler) and the absence of a CLI rollback command.

**Evidence:** https://docs.railway.com, https://docs.railway.com/ai/mcp-server.md, https://docs.railway.com/databases/postgresql.md

#### 2. Render

Render scores 5/5 across all criteria and pulls ahead of Railway on database quality: fully managed PostgreSQL (versions 13–18) with PITR, private networking, and automatic failover on higher plans. The two React SPAs can be served as free Render Static Sites (zero cost, CDN-backed) while only the Express backend and database incur charges (~$14/month). Rollback is available via both the dashboard and the REST API, making it scriptable. The MCP server at `mcp.render.com` includes pre-built agent skills for deploy, debug, and monitor workflows. The gap vs. Railway: no pnpm/monorepo auto-import for Docker services (requires manual `render.yaml` Blueprint), and slightly higher effective cost (~$14/month vs $5/month at pre-launch scale).

**Evidence:** https://render.com/docs, https://render.com/docs/mcp-server, https://render.com/docs/postgresql-creating-connecting

#### 3. Fly.io

Fly.io offers the most infrastructure control: Docker containers deploy directly via `fly deploy`, always-on VMs are configurable per-service, and Fly Machines can be set to never auto-stop. Pricing is per-second usage-based with no free tier (credit card required at signup). The main gaps: `fly mcp` is fully `[experimental]`, making it unsuitable for reliable agent-driven ops; Fly Postgres is explicitly unmanaged ("if Postgres crashes, you'll need to do a little work to get it back"); and there is no `fly rollback` CLI command — rollback requires re-deploying a previous image digest. At ~$9–12/month with unmanaged Postgres, it offers no meaningful cost advantage over Railway's $5/month while requiring more manual database management.

**Evidence:** https://fly.io/docs, https://fly.io/docs/launch/monorepo/, https://fly.io/docs/postgres/getting-started/what-you-should-know/

#### 4. OVH VPS (not shortlisted — evaluated on request)

OVH VPS is raw, unmanaged Linux VM infrastructure starting from €5.52/month (VPS-1: 4 vCores, 8 GB RAM, 75 GB SSD). It runs Docker and docker-compose natively with no architectural changes to the existing stack — the `docker-compose.yml` deploys as-is. An official `ovhcloud` CLI (GA since Sept 2025) and Terraform provider manage VPS-level operations, and European datacenter options (including Warsaw) provide strong GDPR data residency guarantees.

However, OVH VPS scores 0 Pass / 3 Partial / 2 Fail on the agent-friendly criteria because it is fundamentally unmanaged infrastructure: the developer (or agent) handles SSL/TLS provisioning, OS patching, firewall configuration, Docker daemon security hardening, application deployment scripting, PostgreSQL backup, and monitoring. There is no managed deploy pipeline, no one-command rollback, no managed database (Postgres runs in a Docker container or requires a separate OVH Public Cloud project with vRack networking), and no official MCP server (a community prototype exists but VPS support is marked WIP). Application-level log access requires SSHing into the server and running `docker compose logs`. For a solo or small team building product features, this operational overhead competes directly with engineering time.

**When OVH VPS makes sense instead:** If the team has existing sysadmin experience, requires EU data residency in a specific country Railway doesn't serve, needs to run additional self-hosted tooling (e.g., Gitea, Plausible), or has a strong cost constraint beyond what Railway's $5/month covers at higher traffic — OVH VPS is worth revisiting. At that point, pair it with OVH's Public Cloud managed PostgreSQL for the database.

**Evidence:** https://www.ovhcloud.com/en-ie/vps/, https://help.ovhcloud.com/csm/en-ie-vps-install-docker-on-vps, https://github.com/ovh/ovhcloud-cli

---

## Anti-Bias Cross-Check: Railway

### Devil's Advocate — Weaknesses

1. **Unmanaged PostgreSQL with no connection pooler.** Railway's Postgres is a bare container — no PgBouncer, no automatic failover. Prisma creates a new connection pool per process restart; with multiple service restarts or traffic spikes, PostgreSQL's `max_connections` can be exhausted and bring the API down. Mitigation requires adding `?connection_limit=1` to the Prisma connection string or deploying PgBouncer as a separate Railway service — neither is documented in Railway's PostgreSQL guide.

2. **No CLI rollback — a real gap for agent-driven ops.** `railway rollback` does not exist. An agent that deploys a bad release cannot programmatically roll back via CLI; it must use the dashboard UI or figure out how to re-push the prior Docker image via `railway up`. The dashboard rollback also has a 72-hour image retention window on Hobby — anything older is unrecoverable without the original image.

3. **Dockerfile COPY path issues in Turborepo monorepos.** If any Dockerfile uses `COPY ../../packages/types .` to pull shared workspace packages (common in monorepos), the build fails because Railway's default build context is scoped to the service's `rootDir`. Requires setting `RAILWAY_DOCKERFILE_PATH` and adjusting all Dockerfile paths, or setting build context to repo root — a non-obvious step not prominent in Railway's monorepo docs.

4. **Inter-project egress is billed.** Railway's private networking (`.railway.internal`) only works within the same project. When new microservices (e.g., a workout-data service) are added as a separate Railway project, inter-service calls traverse the public network and incur $0.05/GB egress costs.

5. **`railway up` uploads source, not Docker images.** The CLI sends raw source to Railway's remote build infra — local Docker layer caches are useless. Turborepo Remote Cache must be configured separately (external cache: Vercel Remote Cache or self-hosted), otherwise every deploy rebuilds all packages from scratch, negating Turborepo's incremental build advantage.

### Pre-mortem — How This Could Fail

The Instigi team deployed to Railway in Week 1, impressed by the $5/month price and seamless Turborepo detection. Three services started cleanly. Week 3: a schema migration was pushed without a pre-deploy health check — Prisma ran the migration but a code bug prevented the API container from starting. The team tried to roll back via CLI, discovered there's no `railway rollback`, scrambled to find the dashboard rollback button on mobile, and wasted 40 minutes. The database migration had already run and was not reversible. The app was down for 90 minutes at the exact moment they sent beta invites.

Week 6: a brief Product Hunt spike brought 150 concurrent users. Prisma's default connection pool (10 connections per instance) plus a second service instance that had just restarted pushed 22 concurrent connections into Railway's Postgres container. Postgres hit memory pressure, the container crashed, and Railway did not automatically restart it with corrected shared memory settings. Recovery required SSHing into the Postgres service and running `pg_ctl restart` manually. The root causes: no connection pooler, no tested rollback procedure, and no spend alerts — the traffic spike pushed them over the Hobby credit cap, pausing all services mid-incident. The $5/month assumption broke down the first time real traffic arrived.

### Unknown Unknowns

- **`railway up` does not reuse pre-built Docker images.** It uploads source and builds remotely. If CI already builds and tests a Docker image, that image cannot be reused on Railway without pushing to a public registry (Docker Hub / GHCR) and switching to an image-backed service — or upgrading to Pro for private registry support. This doubles effective build time in a CI+Railway workflow.

- **TCP Proxy for external DB access is billed.** Using Prisma Studio, TablePlus, or any local tool to inspect the Railway-hosted Postgres goes through Railway's TCP Proxy and is billed at $0.05/GB. During active development with multiple engineers running `db:studio` sessions, this adds up as surprise charges on an otherwise flat $5/month plan.

- **Hobby plan's image retention is 72 hours — not unlimited history.** The dashboard shows all past deployments, creating the impression that any deployment can be rolled back. In practice, images older than 72 hours are purged on Hobby. A production incident discovered Monday morning that started Friday may have no rollback target.

- **Railway Metal regions are limited.** As of May 2026, Railway Metal runs in US West, US East, EU West, and Southeast Asia only. There is no "choose any cloud region" flexibility. If GDPR data residency in a specific EU country is ever required, Railway may not satisfy it.

- **Turborepo Remote Cache requires separate setup.** Railway does not provide or integrate with Turborepo Remote Cache. Without external cache (`TURBO_TOKEN` + `TURBO_TEAM` pointing to Vercel Remote Cache or a self-hosted Turborepo cache server), every Railway deploy rebuilds all workspace packages — the incremental build advantage of Turborepo is entirely lost on Railway's remote build infra.

---

## Operational Story

- **Preview deploys**: Railway does not have built-in PR preview URLs. Each service runs in a named environment (default: `production`). Preview environments must be created manually as separate Railway environments (e.g., `staging`). This is a manual setup, not an automatic per-PR flow.

- **Secrets**: Environment variables live in Railway's project dashboard per service, injected as env vars at runtime. `DATABASE_URL` for co-located Postgres is auto-injected via Railway's reference variable syntax (`${{Postgres.DATABASE_URL}}`). Secrets are never committed to the repo. Rotation: update the variable in the Railway dashboard — the service re-deploys automatically. CLI: `railway variables set KEY=value`.

- **Rollback**: Dashboard-only — open the service's deployment history, click "Rollback" on any deployment within the 72-hour retention window (Hobby plan). The CLI has no rollback command. For agent-scripted rollback, use the Railway REST API (`POST /v1/deployments/{id}/rollback`) with the `RAILWAY_API_KEY`. Time-to-revert: ~1–2 minutes (container rebuild). **Data caveat**: database migrations do not roll back automatically — schema changes that ran before the code rollback remain in place; coordinate migrations carefully.

- **Approval**: Only a human should: run `railway down` in production (removes the deployment), rotate the Railway API key, delete a service or database, change billing/plan tier. The agent may perform unattended: `railway up` (deploy), `railway logs` (log streaming), `railway variables set/get` (env management), MCP tools (`deploy`, `get-logs`, `list-variables`).

- **Logs**: Stream live: `railway logs --service backend --environment production`. Filter errors: `railway logs --filter "@level:error" --since 1h`. Via MCP: `get-logs` tool in `railway mcp install`-configured agent. Log retention on Hobby: determined by Railway's platform default (not explicitly documented — treat as ephemeral; set up external log drain for persistence if needed).

---

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| PostgreSQL connection pool exhaustion under traffic spike | Devil's advocate | M | H | Add `?connection_limit=5&pool_timeout=10` to Prisma connection string; consider deploying PgBouncer as a Railway service |
| Bad deploy with no CLI rollback path | Devil's advocate | M | H | Document the API rollback call (`POST /v1/deployments/{id}/rollback`) and test it once before going live; set up a Makefile target or script |
| Dockerfile COPY path failure for monorepo shared packages | Devil's advocate | H | M | Set `RAILWAY_DOCKERFILE_PATH` and use repo root as build context; test all three Dockerfiles with `docker build` from repo root before first deploy |
| $5/month credit cap breached during traffic spike | Pre-mortem | M | H | Set a Railway spend limit in billing settings; configure alerts at 80% of monthly credit |
| Postgres container crash under memory pressure | Pre-mortem | L | H | Monitor Postgres memory via Railway metrics; set resource limits and restart policies; test restart recovery before going live |
| Image retention 72h means no rollback after 3 days | Unknown unknowns | M | M | Keep Docker images pushed to GHCR as part of CI; tag production deploys so older images remain available |
| TCP Proxy egress charges for local DB tools | Unknown unknowns | H | L | Prefer Railway's web-based DB view or tunnel sparingly; set egress budget alert |
| Turborepo cache unused on Railway remote builds | Unknown unknowns | H | M | Configure `TURBO_TOKEN` + `TURBO_TEAM` pointing to Vercel Remote Cache (free for open-source) or self-hosted; add to Railway env vars |
| GDPR region constraint if EU data residency required | Research finding | L | H | Confirm target user region before launch; Railway EU West is available but specific country residency may not satisfy all requirements |
| `railway up` re-builds source instead of reusing CI image | Unknown unknowns | M | L | Switch to image-backed Railway services (push to GHCR in CI, point Railway at image URL) once CI is configured |

---

## Getting Started

1. **Install Railway CLI and authenticate**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create a Railway project and link the repo**
   ```bash
   railway init         # creates a new project
   railway link         # link to existing project (if created via dashboard)
   ```

3. **Configure services in the monorepo**
   For each of the three services (Express API, web-app, admin-app), create a Railway service and set its root directory and Dockerfile path:
   - In the Railway dashboard: `+ New Service → Empty Service → Settings → Source → Root Directory`
   - Set `RAILWAY_DOCKERFILE_PATH` env var per service if needed
   - **Critical:** if Dockerfiles use `COPY` from the monorepo root (e.g., shared `packages/`), set the build context to repo root and adjust all Dockerfile `COPY` paths accordingly — test with `docker build -f services/auth-service/Dockerfile .` from repo root first

4. **Provision PostgreSQL and wire the connection**
   ```bash
   # In Railway dashboard: + New → Database → PostgreSQL (select version 17)
   # Then in the auth-service (and future workout-service) environment variables:
   # Add: DATABASE_URL = ${{Postgres.DATABASE_URL}}?connection_limit=5&pool_timeout=10
   ```
   The `connection_limit` parameter is critical — add it before first deploy to prevent Prisma connection exhaustion.

5. **Install the Railway MCP server for agent workflows**
   ```bash
   railway mcp install   # configures MCP for detected AI tools (Cursor, VS Code, Claude Code, Copilot)
   # Or for remote MCP (no local CLI needed by agent):
   railway mcp install --remote
   ```

---

## Out of Scope

The following were not evaluated in this research:
- Docker image build configuration or Dockerfile optimisation
- CI/CD pipeline setup (no CI is currently configured in the repo)
- Production-scale architecture (multi-region, HA, DR)
- GDPR compliance tooling
- Turborepo Remote Cache configuration (noted as a risk but not detailed)
