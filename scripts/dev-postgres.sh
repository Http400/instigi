#!/usr/bin/env bash
#
# dev-postgres.sh — run a local Postgres for backend development.
#
# Starts a standalone Postgres container that matches the DATABASE_URL used by
# the backend services' local .env files (host localhost:5432). Idempotent:
# re-running starts the existing container instead of failing.
#
# Config (override via env vars, defaults match services/*/.env):
#   PG_CONTAINER   container name           (default: instigi-pg)
#   PG_IMAGE       postgres image           (default: postgres:17-alpine)
#   PG_PORT        host port to publish     (default: 5432)
#   POSTGRES_USER  db superuser             (default: postgres)
#   POSTGRES_PASSWORD  db password          (default: change-me-in-production)
#   POSTGRES_DB    initial database         (default: instigi_db)
#
# Usage:
#   ./scripts/dev-postgres.sh          # start (create or resume)
#   ./scripts/dev-postgres.sh stop     # stop the container
#   ./scripts/dev-postgres.sh rm       # stop and remove the container + data
#   ./scripts/dev-postgres.sh logs     # follow container logs

set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-instigi-pg}"
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"
PG_PORT="${PG_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-in-production}"
POSTGRES_DB="${POSTGRES_DB:-instigi_db}"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed or not on PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

container_exists() { docker ps -a --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; }
container_running() { docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; }

cmd="${1:-start}"

case "$cmd" in
  stop)
    if container_running; then
      docker stop "$PG_CONTAINER" >/dev/null
      echo "stopped $PG_CONTAINER"
    else
      echo "$PG_CONTAINER is not running"
    fi
    exit 0
    ;;
  rm)
    if container_exists; then
      docker rm -f "$PG_CONTAINER" >/dev/null
      echo "removed $PG_CONTAINER (data discarded)"
    else
      echo "$PG_CONTAINER does not exist"
    fi
    exit 0
    ;;
  logs)
    docker logs -f "$PG_CONTAINER"
    exit 0
    ;;
  start) ;;
  *)
    echo "usage: $0 [start|stop|rm|logs]" >&2
    exit 1
    ;;
esac

if container_running; then
  echo "$PG_CONTAINER already running on localhost:${PG_PORT}"
elif container_exists; then
  docker start "$PG_CONTAINER" >/dev/null
  echo "resumed $PG_CONTAINER on localhost:${PG_PORT}"
else
  docker run -d \
    --name "$PG_CONTAINER" \
    -p "${PG_PORT}:5432" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -v "${PG_CONTAINER}-data:/var/lib/postgresql/data" \
    "$PG_IMAGE" >/dev/null
  echo "started $PG_CONTAINER on localhost:${PG_PORT}"
fi

echo -n "waiting for postgres to accept connections"
for _ in $(seq 1 30); do
  if docker exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
    echo " — ready."
    echo
    echo "DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PG_PORT}/${POSTGRES_DB}"
    echo
    echo "next:"
    echo "  pnpm --filter @instigi/auth-service db:migrate"
    echo "  pnpm --filter @instigi/auth-service dev"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo
echo "error: postgres did not become ready in time. Check: $0 logs" >&2
exit 1
