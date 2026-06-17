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
│   └── auth-service/   # Express 5 + Prisma 7 + PostgreSQL  (port 4000)
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

## Docker (full stack)

To run the production-style container stack:

```bash
# Copy and configure env for Docker
cp .env.example .env

docker compose up --build
```

| Service      | URL                   |
| ------------ | --------------------- |
| web-app      | `https://instigi.com` |
| admin-app    | `https://admin.instigi.com` |
| auth-service | `https://api.instigi.com` |
| PostgreSQL   | internal only         |

## Deployment (VPS)

The app is deployed via Docker Compose behind a single Caddy reverse proxy. Public HTTP and HTTPS traffic enters on ports 80 and 443, and Caddy routes requests by hostname. Caddy automatically provisions and renews TLS certificates for the configured production hostnames.

Before starting the stack, make sure the VPS firewall allows inbound `80/tcp` and `443/tcp`.

### Subdomain routing

| Subdomain                        | Service      |
| -------------------------------- | ------------ |
| `www.instigi.com`, `instigi.com` | web-app      |
| `admin.instigi.com`              | admin-app    |
| `api.instigi.com`                | auth-service |
| `pgadmin.instigi.com`            | pgAdmin      |

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
PGADMIN_BASIC_AUTH_HASH=
```

Generate `PGADMIN_BASIC_AUTH_HASH` with Caddy:

```bash
docker run --rm caddy caddy hash-password --plaintext 'your-password'
```

**4. Build and start all services**

```bash
docker compose up -d --build
```

On first start, `auth-service` automatically runs `prisma migrate deploy` before the Node.js process begins.

### Production checks

After DNS is live and the stack starts, verify the public routes:

```bash
curl -I https://instigi.com
curl -I https://www.instigi.com
curl -I https://admin.instigi.com
curl https://api.instigi.com/health
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
git pull && docker compose up -d --build

# Stop everything
docker compose down
```

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
curl -X POST https://api.instigi.com/api/auth/register \
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
curl -X POST https://api.instigi.com/api/auth/login \
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
