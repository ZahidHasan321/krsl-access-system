#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

DOMAIN="ap.krsteelbd.com"
EMAIL="admin@krsteelbd.com" # Replace with your actual email if needed

echo "==> Checking for SSL certificates..."
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "    Certificates not found for $DOMAIN. Attempting to generate..."
    # Ensure certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo "    Installing certbot..."
        sudo apt update && sudo apt install -y certbot
    fi
    
    # Stop nginx if it's running to free up port 80 for standalone certbot
    docker compose stop nginx || true
    
    sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
    
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "    ERROR: Failed to generate SSL certificates."
        exit 1
    fi
    echo "    Certificates generated successfully."
fi

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
docker compose exec -T app node --env-file=.env --import=tsx scripts/db-manage.ts seed

echo "==> Done. Current status:"
docker compose ps
