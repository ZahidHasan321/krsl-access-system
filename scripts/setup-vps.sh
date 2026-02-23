#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# One-time VPS setup script
# Run this after your first git clone on the VPS
#
# Tested on: Ubuntu 22.04+ / Debian 12+
# ============================================================

echo "==> Updating system..."
apt-get update && apt-get upgrade -y

# --- Docker ---
echo "==> Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
else
    echo "    Docker already installed."
fi

# --- rclone (for Google Drive backups) ---
echo "==> Installing rclone..."
if ! command -v rclone &> /dev/null; then
    curl https://rclone.org/install.sh | bash
else
    echo "    rclone already installed."
fi

# --- Certbot (for SSL) ---
echo "==> Installing certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get update && apt-get install -y certbot
else
    echo "    Certbot already installed."
fi

# --- Set script permissions ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$SCRIPT_DIR/deploy.sh"
chmod +x "$SCRIPT_DIR/backup.sh"
chmod +x "$SCRIPT_DIR/setup-rclone.sh"

# --- Setup daily backup cron job ---
echo "==> Setting up daily backup cron (2 AM)..."
CRON_CMD="0 2 * * * $SCRIPT_DIR/backup.sh >> /var/log/kr-steel-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_CMD") | crontab -

echo ""
echo "============================================"
echo "  VPS setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Create a .env file from .env.example:"
echo "     cp .env.example .env"
echo "     - Set your MASTER_USERNAME and MASTER_PASSWORD"
echo ""
echo "  2. Configure DNS for your subdomain:"
echo "     ap.krsteelbd.com -> YOUR_VPS_IP"
echo ""
echo "  3. Configure rclone for Google Drive:"
echo "     ./scripts/setup-rclone.sh"
echo ""
echo "  4. Start the app (SSL will be handled automatically):"
echo "     ./scripts/deploy.sh"
echo ""
