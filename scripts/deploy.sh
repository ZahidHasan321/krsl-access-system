#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Rebuilding and restarting containers..."
docker compose up --build -d

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Waiting for postgres to be ready..."
until docker compose exec -T postgres pg_isready -U krcrm -d krcrm > /dev/null 2>&1; do
    echo "    waiting..."
    sleep 2
done
echo "    postgres is ready."

echo "==> Running database migrations..."
docker compose exec -T app npx drizzle-kit migrate

echo "==> Seeding roles, permissions & default admin user..."
docker compose exec -T app npx tsx scripts/db-manage.ts seed

echo "==> Done. Current status:"
docker compose ps
