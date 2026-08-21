# Instigi

This application helps users track and manage their workouts in a simple, structured way. It allows users to log exercises, monitor progress over time, and stay consistent with their fitness goals through personalized workout history and performance insights. The app is designed to make workout tracking fast, intuitive, and motivating for both beginners and experienced athletes.

## Architecture

A pnpm + Turborepo monorepo with shared packages, React apps, and a Node.js auth service.

## Structure

```
instigi/
├── apps/
│   ├── web-app/        # Vite + React 19 + MUI  (port 3000)
│   └── admin-app/      # Vite + React 19 + MUI  (port 3001)
├── services/
│   ├── auth-service/   # Express 5 + Prisma 7 + PostgreSQL  (port 4000)
│   └── training-service/ # Express 5 + Prisma 7 + PostgreSQL  (port 4001)
├── packages/
│   ├── ui/             # Shared MUI component library
│   └── types/          # Shared TypeScript types
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10 — `npm install -g pnpm`
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp services/auth-service/.env.example services/auth-service/.env
```

Edit `services/auth-service/.env` and set secure values for `JWT_SECRET` and `JWT_REFRESH_SECRET` in non-development environments.

### 3. Start PostgreSQL

```bash
docker compose up postgres -d
```

Alternatively, for host-based development (`pnpm dev` on your machine), use the
helper script — it runs a standalone Postgres that publishes port **5432** on
`localhost` and matches the services' local `.env` `DATABASE_URL`:

```bash
./scripts/dev-postgres.sh          # start (create or resume) and wait until ready
./scripts/dev-postgres.sh stop     # stop the container
./scripts/dev-postgres.sh rm       # remove the container and its data volume
./scripts/dev-postgres.sh logs     # follow logs
```

The script is idempotent and prints the resulting `DATABASE_URL` plus the next
migrate/dev steps. Connection values are overridable via env vars
(`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `PG_PORT`, `PG_CONTAINER`,
`PG_IMAGE`).

### 4. Run database migrations

```bash
pnpm --filter @instigi/auth-service db:migrate
```

### 5. Start all services in dev mode

```bash
pnpm dev
```

This starts everything in parallel via Turborepo:

| Service      | URL                   |
| ------------ | --------------------- |
| web-app      | http://localhost:3000 |
| admin-app    | http://localhost:3001 |
| auth-service | http://localhost:4000 |
| training-service | http://localhost:4001 |

---

## UI Package (`packages/ui`)

The `@instigi/ui` package is a shared MUI component library used by both apps. It includes a [Storybook](https://storybook.js.org/) setup for developing and previewing components in isolation.

### Run Storybook

```bash
pnpm --filter @instigi/ui storybook
```

Storybook will be available at **http://localhost:6006**.

---

## Running individual services

```bash
# Web app only
pnpm dev --filter @instigi/web-app

# Admin app only
pnpm dev --filter @instigi/admin-app

# Auth service only
pnpm dev --filter @instigi/auth-service

# Training service only
pnpm dev --filter @instigi/training-service
```

## Common Commands

| Command                                          | Description                          |
| ------------------------------------------------ | ------------------------------------ |
| `pnpm dev`                                       | Start all services in watch/dev mode |
| `pnpm build`                                     | Build all packages                   |
| `pnpm test`                                      | Run all tests                        |
| `pnpm lint`                                      | Type-check all packages              |
| `pnpm --filter @instigi/auth-service db:migrate` | Run Prisma migrations                |
| `pnpm --filter @instigi/auth-service db:studio`  | Open Prisma Studio                   |
| `pnpm --filter @instigi/training-service db:migrate` | Run training-service Prisma migrations |
| `./scripts/dev-postgres.sh`                      | Start a local dev Postgres (port 5432) |

## Docker (full stack)

To run the production-style container stack:

```bash
# Copy and configure env for Docker
cp .env.example .env

docker compose up --build
```

| Service      | URL                         |
| ------------ | --------------------------- |
| web-app      | `https://instigi.com`       |
| admin-app    | `https://admin.instigi.com` |
| auth-service | `https://api.instigi.com/auth`   |
| training-service | `https://api.instigi.com/training` |
| PostgreSQL   | internal only               |

## Deployment (VPS)

The app is deployed via Docker Compose behind a single Caddy reverse proxy. Public HTTP and HTTPS traffic enters on ports 80 and 443, and Caddy routes requests by hostname. Caddy automatically provisions and renews TLS certificates for the configured production hostnames.

Before starting the stack, make sure the VPS firewall allows inbound `80/tcp` and `443/tcp`.

### HTTP routing

| Host / path                          | Service          |
| ------------------------------------ | ---------------- |
| `www.instigi.com`, `instigi.com`     | web-app          |
| `admin.instigi.com`                  | admin-app        |
| `api.instigi.com/auth/*`             | auth-service     |
| `api.instigi.com/training/*`         | training-service |
| `pgadmin.instigi.com`                | pgAdmin          |

Caddy strips the `/auth` and `/training` path prefixes before proxying, so
`api.instigi.com/auth/api/auth/login` reaches auth-service as `/api/auth/login`.

### Deploy steps

**1. Point DNS** — create A records for `instigi.com`, `www`, `admin`, `api`, and `pgadmin` pointing to your VPS IP. Certificate issuance will only work after DNS reaches the VPS on ports 80 and 443.

**2. SSH into the VPS and clone the repo**

```bash
git clone https://github.com/Http400/instigi.git
cd instigi
```

**3. Create the `.env` file**

```bash
cp .env.example .env
```

Edit `.env` and fill in secure values for all variables:

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=3600
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
CADDY_ACME_EMAIL=admin@instigi.com
PGADMIN_BASIC_AUTH_USER=admin
PGADMIN_BASIC_AUTH_HASH='$2a$14$paste-generated-caddy-hash-here'
VITE_API_URL=https://api.instigi.com
```

`VITE_API_URL` is the **public** origin of the API gateway (Caddy), without any
path suffix. The frontends append `/auth` and `/training` themselves, and Caddy
strips those prefixes before proxying to the auth- and training-services. Vite
inlines this value into the SPA bundles **at build time** via a Docker build arg,
so it must be set before `docker compose build`; if omitted it defaults to
`https://api.instigi.com`. Because it is baked into the image, **changing the
origin requires rebuilding** the `web-app` / `admin-app` images. In local
development leave `VITE_API_URL` unset — the SPAs then use relative URLs and the
Vite dev server proxies `/auth` → `localhost:4000` and `/training` →
`localhost:4001` (see `apps/web-app/vite.config.ts`).

Generate `PGADMIN_BASIC_AUTH_HASH` with Caddy:

```bash
docker run --rm caddy caddy hash-password --plaintext 'your-password'
```

Keep the generated hash single-quoted in `.env`. Caddy password hashes contain `$`
characters, and unquoted `$` characters can be interpreted by Docker Compose while
it reads `.env`.

**4. Build and start all services**

```bash
COMPOSE_PARALLEL_LIMIT=1 docker compose up -d --build
```

`COMPOSE_PARALLEL_LIMIT=1` keeps small VPS hosts from building both frontend images at the same time. If a build fails with `ERR_PNPM_ENOSPC`, free Docker build cache first with `docker builder prune -af`, then rerun the deploy command above.

On first start, `auth-service` and `training-service` each automatically run `prisma migrate deploy` before their Node.js process begins.

If Postgres was already initialized once on the VPS, changing `POSTGRES_USER`,
`POSTGRES_PASSWORD`, or `POSTGRES_DB` in `.env` does not update the existing
database volume. If `auth-service` logs `P1000: Authentication failed`, either
restore the old database credentials in `.env` or rotate the password inside the
running database:

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '\''$POSTGRES_PASSWORD'\'';"'
docker compose restart auth-service
```

If the VPS database has no data to keep, recreate the Postgres volume instead:

```bash
docker compose down -v
COMPOSE_PARALLEL_LIMIT=1 docker compose up -d --build
```

### Production checks

After DNS is live and the stack starts, verify the public routes:

```bash
curl -I https://instigi.com
curl -I https://www.instigi.com
curl -I https://admin.instigi.com
curl https://api.instigi.com/auth/health
curl -I https://pgadmin.instigi.com
```

`pgadmin.instigi.com` should require HTTP basic auth before showing the pgAdmin login screen.

### Useful commands on the VPS

```bash
# View logs
docker compose logs -f

# Restart a single service
docker compose restart auth-service

# Pull latest code and redeploy
git pull && COMPOSE_PARALLEL_LIMIT=1 docker compose up -d --build

# Free Docker build cache if the VPS reports ERR_PNPM_ENOSPC
docker builder prune -af

# Stop everything
docker compose down
```

## CI/CD (GitHub Actions)

Three workflows live in `.github/workflows`:

- **`ci.yml`** — runs `pnpm lint`, `pnpm typecheck`, and `pnpm build` on every push and PR to `master`.
- **`test.yml`** — runs `pnpm test`.
- **`deploy.yml`** — on every push to `master`: builds and pushes the four service images
  (`auth-service`, `training-service`, `web-app`, `admin-app`) to GHCR tagged with the full
  commit SHA, then SSHes into the VPS and rolls out the release.

Deployment uses a separate `docker-compose.prod.yml` that **pulls prebuilt GHCR images by
commit SHA** (`ghcr.io/http400/instigi/<service>:${APP_SHA}`) instead of building on the VPS.
The `deploy` job copies `docker-compose.prod.yml` and `caddy/Caddyfile` to the VPS, sets
`APP_SHA` in the VPS `.env`, `docker compose pull`s, then `up -d --wait`. A smoke test hits
`SMOKE_URL`; if it fails the stack automatically rolls back to the previous `APP_SHA`.

The dev `docker-compose.yml` (which builds locally) is unchanged, so local
`docker compose up --build` still works.

### Required GitHub configuration

Repository **secrets**:

| Secret         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `VPS_HOST`     | VPS hostname or IP for SSH/SCP.                                           |
| `VPS_USER`     | SSH user (optional; defaults to `ubuntu`).                               |
| `VPS_SSH_KEY`  | Private SSH key with access to the VPS.                                  |
| `GHCR_TOKEN`   | Optional PAT (`read:packages`) so the VPS can pull private GHCR images.  |
| `GHCR_USERNAME`| Optional GHCR username for the VPS login (defaults to the repo owner).   |

Repository **variables**:

| Variable       | Description                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `SMOKE_URL`    | Public URL curled after rollout (e.g. `https://instigi.com`). Required.          |
| `VITE_API_URL` | Optional; baked into the frontend bundles. Defaults to `https://api.instigi.com`.|

### VPS prerequisites

- Docker + Docker Compose v2 installed.
- Project directory `/home/ubuntu/instigi` containing a populated `.env` (see the variables
  listed under "Create the `.env` file" above — `APP_SHA` is managed automatically by the
  workflow; the directory itself is created automatically on first deploy).
- The configured SSH user able to pull the GHCR images.

The `production` GitHub environment gates the deploy job; add required reviewers there if you
want manual approval before rollout.

## Auth Service API

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| `POST` | `/api/auth/register` | Register a new user        |
| `POST` | `/api/auth/login`    | Log in, returns JWT tokens |
| `POST` | `/api/auth/refresh`  | Refresh access token       |
| `GET`  | `/health`            | Health check               |

### Example: Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"Alice","password":"secret123"}'
```

Production:

```bash
curl -X POST https://api.instigi.com/auth/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"Alice","password":"secret123"}'
```

### Example: Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

Production:

```bash
curl -X POST https://api.instigi.com/auth/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

## Tech Stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Package manager  | pnpm workspaces           |
| Task runner      | Turborepo                 |
| Frontend         | React 19, Vite 8, MUI v9  |
| Testing          | Vitest 4, Testing Library |
| Backend          | Express 5, TypeScript 6   |
| ORM              | Prisma 7 (PostgreSQL)     |
| Containerisation | Docker, Caddy             |
