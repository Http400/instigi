# 06 – Prepare for Deployment

## Problem

Instigi's current `docker-compose.yml` has no top-level nginx reverse proxy — each service exposes ports directly. The goal is to mirror the futbalo pattern: a single nginx container that routes all traffic by subdomain, ready to run on a VPS at `instigi.com`.

## Key Differences vs Futbalo

| | Futbalo | Instigi |
|---|---|---|
| Web/Admin images | Alpine volume providers (no nginx inside) | nginx:alpine runners (serve own static files) |
| Nginx serves static | `volumes_from` → files on disk | Must **proxy** to `web-app:80` / `admin-app:80` |
| Postgres creds | `${POSTGRES_USER}` env vars | Hard-coded in compose (must change) |
| pgAdmin | Yes | Missing (add it) |
| Auth service migrate | CMD in compose | In Dockerfile CMD only |
| Domain | futbalo.eu | instigi.com |

## Planned Changes

### 1. Create `nginx/nginx.conf`

Subdomain routing (all on port 80):
- `instigi.com` + `www.instigi.com` → proxy to `http://web-app:80`
- `admin.instigi.com` → proxy to `http://admin-app:80`
- `api.instigi.com /auth/` → proxy to `http://auth-service:4000/` (strip prefix)
- `pgadmin.instigi.com` → proxy to `http://pgadmin:80`

Since instigi's web/admin apps are full nginx containers (not volume providers), the top-level nginx must reverse-proxy rather than serve files directly.

### 2. Update `docker-compose.yml`

- **postgres**: switch hard-coded creds to `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}` env vars; remove exposed port `5432`
- **auth-service**: switch `DATABASE_URL` to use env vars; remove exposed port `4000`; add `prisma migrate deploy` to startup command
- **web-app**: remove exposed port `3000`
- **admin-app**: remove exposed port `3001`
- **pgadmin**: add new service with `${PGADMIN_DEFAULT_EMAIL}` / `${PGADMIN_DEFAULT_PASSWORD}`
- **nginx**: add service → image `nginx:alpine`, port `80:80`, mount `./nginx/nginx.conf`, depends on all other services

### 3. Create `.env.example`

Documents all required secrets for the VPS:

```
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=3600
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
```

## Files to Create/Modify

| File | Action |
|---|---|
| `nginx/nginx.conf` | Create |
| `docker-compose.yml` | Modify |
| `.env.example` | Create |
