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

To run everything in containers locally:

```bash
# Copy and configure env for Docker
cp services/auth-service/.env.example services/auth-service/.env

docker compose up --build
```

| Service      | URL                   |
| ------------ | --------------------- |
| web-app      | http://localhost:3000 |
| admin-app    | http://localhost:3001 |
| auth-service | http://localhost:4000 |
| PostgreSQL   | http://localhost:5432 |

## Deployment (VPS)

The app is deployed via Docker Compose behind a single nginx reverse proxy. All traffic enters on port 80 and is routed by subdomain.

### Subdomain routing

| Subdomain                        | Service      |
| -------------------------------- | ------------ |
| `www.instigi.com`, `instigi.com` | web-app      |
| `admin.instigi.com`              | admin-app    |
| `api.instigi.com`                | auth-service |
| `pgadmin.instigi.com`            | pgAdmin      |

### Deploy steps

**1. Point DNS** — create A records for `instigi.com`, `www`, `admin`, `api`, and `pgadmin` pointing to your VPS IP.

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
```

**4. Build and start all services**

```bash
docker compose up -d --build
```

On first start, `auth-service` automatically runs `prisma migrate deploy` before the Node.js process begins.

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

### Example: Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
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
| Containerisation | Docker, nginx             |
