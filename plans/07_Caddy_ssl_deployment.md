# Caddy SSL Deployment Plan

## Summary

Replace the root `nginx` reverse-proxy service with Caddy running inside Docker Compose. Caddy will terminate HTTPS automatically, persist certificates in Docker volumes, and route the existing production subdomains:

- `instigi.com`, `www.instigi.com` -> `web-app:80`
- `admin.instigi.com` -> `admin-app:80`
- `api.instigi.com` -> `auth-service:4000`
- `pgadmin.instigi.com` -> `pgadmin:80` behind Caddy basic auth

The public auth API should remain `https://api.instigi.com/api/auth/...`, matching the Express route mounting in `auth-service`.

## Key Changes

- Add `caddy/Caddyfile` with:
  - Global ACME email from `{$CADDY_ACME_EMAIL}`.
  - HTTPS site blocks for the four hostname groups.
  - `reverse_proxy` to Docker service names.
  - `basic_auth` on `pgadmin.instigi.com` using `{$PGADMIN_BASIC_AUTH_USER}` and `{$PGADMIN_BASIC_AUTH_HASH}`.

- Update `docker-compose.yml`:
  - Remove the `nginx` service.
  - Add a `caddy` service using the official `caddy` image.
  - Publish ports `80:80` and `443:443`.
  - Mount `./caddy/Caddyfile:/etc/caddy/Caddyfile:ro`.
  - Add persistent volumes `caddy_data` and `caddy_config`.
  - Keep `depends_on` for `web-app`, `admin-app`, `auth-service`, and `pgadmin`.

- Update `.env.example`:
  - Add `CADDY_ACME_EMAIL=admin@instigi.com`.
  - Add `PGADMIN_BASIC_AUTH_USER=admin`.
  - Add `PGADMIN_BASIC_AUTH_HASH=` with instructions to generate it using:

    ```bash
    docker run --rm caddy caddy hash-password --plaintext 'your-password'
    ```

- Update `README.md` deployment docs:
  - Replace nginx references with Caddy.
  - Add DNS requirement for A records pointing to the VPS.
  - Add firewall requirement: allow inbound `80/tcp` and `443/tcp`.
  - Document that Caddy automatically provisions and renews TLS certificates.
  - Correct API examples to use `https://api.instigi.com/api/auth/...` in production.

## Test Plan

- Validate compose syntax:

  ```bash
  docker compose config
  ```

- Validate Caddy config:

  ```bash
  docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
  ```

- Build and start:

  ```bash
  docker compose up -d --build
  ```

- Verify routing after DNS is live:

  ```bash
  curl -I https://instigi.com
  curl -I https://www.instigi.com
  curl -I https://admin.instigi.com
  curl https://api.instigi.com/health
  curl -I https://pgadmin.instigi.com
  ```

- Expected results:
  - Main and admin apps return successful HTML responses.
  - Auth health returns JSON from `auth-service`.
  - pgAdmin requires HTTP basic auth before reaching pgAdmin login.
  - Caddy logs show successful certificate issuance.

## Assumptions

- Caddy will run as a Docker Compose service, not as a host-installed package.
- Production hostnames are the existing `instigi.com` set.
- pgAdmin should remain reachable at `pgadmin.instigi.com` but protected by Caddy basic auth.
- Internal app containers can keep their existing nginx static servers; Caddy only replaces the outer public reverse proxy.
