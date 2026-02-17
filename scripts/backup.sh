#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Google Drive Backup Script
# Backs up: SQLite database, uploads, and drizzle migrations
#
# Prerequisites:
#   1. Install rclone:  curl https://rclone.org/install.sh | sudo bash
#   2. Configure:       rclone config
#      - Choose "Google Drive", name the remote "gdrive"
#      - Follow the OAuth flow (use --no-browser on headless VPS)
#   3. Create the remote folder:
#      rclone mkdir gdrive:kr-steel-crm-backups
# ============================================================

REMOTE_NAME="gdrive"
REMOTE_DIR="kr-steel-crm-backups"
BACKUP_DIR="/tmp/kr-steel-crm-backup"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# Docker volume paths (default docker compose volume mount points)
DB_VOLUME_PATH=$(docker volume inspect kr-steel-crm_db-data --format '{{ .Mountpoint }}')
UPLOAD_VOLUME_PATH=$(docker volume inspect kr-steel-crm_upload-data --format '{{ .Mountpoint }}')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Starting backup at $TIMESTAMP"

# Clean up previous temp backup
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# --- 1. Database backup (safe copy using sqlite3 .backup) ---
echo "==> Backing up database..."
DB_BACKUP="$BACKUP_DIR/local-$TIMESTAMP.db"
sqlite3 "$DB_VOLUME_PATH/local.db" ".backup '$DB_BACKUP'"

# --- 2. Uploads ---
echo "==> Backing up uploads..."
mkdir -p "$BACKUP_DIR/uploads"
cp -a "$UPLOAD_VOLUME_PATH/." "$BACKUP_DIR/uploads/"

# --- 3. Drizzle migrations (for disaster recovery) ---
echo "==> Backing up migrations..."
cp -a "$PROJECT_DIR/drizzle" "$BACKUP_DIR/drizzle"

# --- 4. Compress ---
echo "==> Compressing..."
ARCHIVE="/tmp/kr-steel-crm-$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" .

# --- 5. Sync to Google Drive ---
echo "==> Uploading to Google Drive..."
rclone copy "$ARCHIVE" "$REMOTE_NAME:$REMOTE_DIR/archives/"

# Also keep a live-sync of uploads (incremental, fast)
rclone sync "$UPLOAD_VOLUME_PATH" "$REMOTE_NAME:$REMOTE_DIR/uploads-latest/"

# --- 6. Clean up local temp files ---
rm -rf "$BACKUP_DIR" "$ARCHIVE"

# --- 7. Prune old backups (keep last 30 days of archives) ---
echo "==> Pruning archives older than 30 days..."
rclone delete "$REMOTE_NAME:$REMOTE_DIR/archives/" --min-age 30d

echo "==> Backup complete: $TIMESTAMP"
