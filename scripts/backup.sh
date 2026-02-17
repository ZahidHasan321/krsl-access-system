#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Google Drive Backup Script
#
# Backs up:
#   1. PostgreSQL database (includes biometric templates, all app data)
#   2. Uploaded images (people photos, etc.)
#   3. Drizzle migrations (for disaster recovery)
#
# Prerequisites:
#   1. Install rclone:  curl https://rclone.org/install.sh | sudo bash
#   2. Configure:       rclone config
#      - Choose "Google Drive", name the remote "gdrive"
#      - Follow the OAuth flow (use --no-browser on headless VPS)
#   3. Create the remote folder:
#      rclone mkdir gdrive:kr-steel-crm-backups
#
# Usage:
#   ./scripts/backup.sh              # run manually
#   crontab -e                       # add a daily cron:
#   0 3 * * * /path/to/kr-steel-crm/scripts/backup.sh >> /var/log/kr-backup.log 2>&1
# ============================================================

REMOTE_NAME="gdrive"
REMOTE_DIR="kr-steel-crm-backups"
BACKUP_DIR="/tmp/kr-steel-crm-backup"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "==> Starting backup at $TIMESTAMP"

# Clean up previous temp backup
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# --- 1. PostgreSQL database (contains all app data + biometric templates) ---
echo "==> Backing up PostgreSQL database..."
DB_BACKUP="$BACKUP_DIR/krcrm-$TIMESTAMP.sql"
docker compose exec -T postgres pg_dump -U krcrm --clean --if-exists krcrm > "$DB_BACKUP"
echo "    Database dump: $(du -h "$DB_BACKUP" | cut -f1)"

# --- 2. Uploaded images (people photos, etc.) ---
echo "==> Backing up uploads..."
UPLOAD_VOLUME_PATH=$(docker volume inspect kr-steel-crm_upload-data --format '{{ .Mountpoint }}' 2>/dev/null || true)
if [ -n "$UPLOAD_VOLUME_PATH" ] && [ -d "$UPLOAD_VOLUME_PATH" ]; then
    mkdir -p "$BACKUP_DIR/uploads"
    cp -a "$UPLOAD_VOLUME_PATH/." "$BACKUP_DIR/uploads/"
    echo "    Uploads: $(du -sh "$BACKUP_DIR/uploads" | cut -f1)"
else
    echo "    No uploads volume found, skipping."
fi

# --- 3. Drizzle migrations (for disaster recovery) ---
echo "==> Backing up migrations..."
if [ -d "$PROJECT_DIR/drizzle" ]; then
    cp -a "$PROJECT_DIR/drizzle" "$BACKUP_DIR/drizzle"
fi

# --- 4. Compress ---
echo "==> Compressing..."
ARCHIVE="/tmp/kr-steel-crm-$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" .
echo "    Archive: $(du -h "$ARCHIVE" | cut -f1)"

# --- 5. Upload to Google Drive ---
echo "==> Uploading to Google Drive..."
rclone copy "$ARCHIVE" "$REMOTE_NAME:$REMOTE_DIR/archives/"

# Also keep a live-sync of uploads (incremental, fast)
if [ -n "${UPLOAD_VOLUME_PATH:-}" ] && [ -d "${UPLOAD_VOLUME_PATH:-}" ]; then
    rclone sync "$UPLOAD_VOLUME_PATH" "$REMOTE_NAME:$REMOTE_DIR/uploads-latest/"
fi

# --- 6. Clean up local temp files ---
rm -rf "$BACKUP_DIR" "$ARCHIVE"

# --- 7. Prune old backups (keep last 30 days of archives) ---
echo "==> Pruning archives older than 30 days..."
rclone delete "$REMOTE_NAME:$REMOTE_DIR/archives/" --min-age 30d

echo "==> Backup complete: $TIMESTAMP"
