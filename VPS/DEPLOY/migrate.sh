#!/bin/sh
# Existing v0.1 volumes only: backup first, then apply the starter's idempotent SQL.
set -eu
cd "$(dirname "$0")"
[ "${1:-}" = "--after-backup" ] || { echo "Backup va kiem tra truoc; sau do: sh migrate.sh --after-backup" >&2; exit 1; }
for file in ../SERVER/sql/[0-9]*.sql; do
  echo "Applying idempotent migration: $(basename "$file")"
  docker compose --env-file .env exec -T db sh -c 'exec psql --single-transaction -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
done
