#!/usr/bin/env bash
# Nightly logical backup: pg_dump via the running postgres container, gzipped,
# written next to (not inside) the bind-mounted Postgres data volume so both
# land in the same Btrfs shared folder Hyper Backup already covers.
#
# This is a second, independent layer on top of Hyper Backup's filesystem
# snapshot of the raw data directory (punch list step 6): the snapshot
# protects against NAS/disk failure, this protects against bad or corrupted
# data making it into a snapshot unnoticed, since these are separate
# timestamped SQL dumps you can inspect or restore individually instead of
# one whole-volume state.
#
# Run manually, or on a schedule via Synology's Task Scheduler
# (Control Panel > Task Scheduler > Create > Scheduled Task > User-defined
# script), pointed at this script, running as the user that owns the
# docker-compose project.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source .env 2>/dev/null || true
set +a

BACKUP_DIR="${BACKUP_DIR:-${DATA_DIR:-./data}/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP=$(date +%Y-%m-%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-sweetdreams}" "${POSTGRES_DB:-sweetdreams}" \
  | gzip > "$BACKUP_DIR/sweetdreams-$STAMP.sql.gz"

find "$BACKUP_DIR" -name 'sweetdreams-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written: $BACKUP_DIR/sweetdreams-$STAMP.sql.gz"
