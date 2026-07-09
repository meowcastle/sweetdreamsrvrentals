#!/usr/bin/env bash
# Restores a gzipped pg_dump produced by backup-db.sh. Destructive: drops and
# recreates every table in the target database first, so this asks for
# explicit confirmation before doing anything. A backup strategy that's
# never been restored from isn't a tested one - run this against a local
# stack at least once, not just when you actually need it.
#
# Usage: scripts/restore-db.sh path/to/sweetdreams-2026-07-08-120000.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source .env 2>/dev/null || true
set +a

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: $0 path/to/backup.sql.gz" >&2
  exit 1
fi

DB="${POSTGRES_DB:-sweetdreams}"
USER="${POSTGRES_USER:-sweetdreams}"

# Some Synology Container Manager installs only ship the older hyphenated
# docker-compose binary, not the `docker compose` plugin subcommand this
# repo otherwise assumes - detect whichever is actually available.
if docker compose version > /dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

echo "This will DROP and recreate every table in the '$DB' database, then"
echo "restore from: $DUMP_FILE"
read -p "Type the database name ($DB) to confirm: " CONFIRM
if [ "$CONFIRM" != "$DB" ]; then
  echo "Aborted."
  exit 1
fi

"${DC[@]}" exec -T postgres psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "$DUMP_FILE" | "${DC[@]}" exec -T postgres psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1

echo "Restore complete."
