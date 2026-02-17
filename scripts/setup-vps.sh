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

# --- sqlite3 (for safe database backups) ---
echo "==> Installing sqlite3..."
apt-get install -y sqlite3

# --- Set script permissions ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$SCRIPT_DIR/deploy.sh"
chmod +x "$SCRIPT_DIR/backup.sh"

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
echo "  1. Copy your .env file to the project root"
echo "     (make sure DATABASE_URL=/app/data/local.db)"
echo ""
echo "  2. Configure rclone for Google Drive:"
echo "     rclone config"
echo "     - Name the remote: gdrive"
echo "     - Type: Google Drive"
echo "     - Use --no-browser flag for headless setup"
echo ""
echo "  3. Create the backup folder on Drive:"
echo "     rclone mkdir gdrive:kr-steel-crm-backups"
echo ""
echo "  4. Start the app:"
echo "     ./scripts/deploy.sh"
echo ""
echo "  5. (Optional) Add your domain to Caddyfile"
echo "     for automatic HTTPS"
echo ""
