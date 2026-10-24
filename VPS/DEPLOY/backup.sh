#!/bin/sh
# Manual PostgreSQL backup. No pipeline: a failed pg_dump must not report success.
set -eu
umask 077
cd "$(dirname "$0")"
: "${BACKUP_DIR:=/opt/viet-village-backups}"
case "$BACKUP_DIR" in /*) ;; *) echo "BACKUP_DIR phai la duong dan tuyet doi." >&2; exit 1 ;; esac
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
tmp=$(mktemp "$BACKUP_DIR/.vietvillage-$(date -u +%Y%m%dT%H%M%SZ).XXXXXX")
trap 'rm -f "$tmp"' EXIT HUP INT TERM
# Read the database identity inside the running DB container, not via grep of .env.
docker compose --env-file .env exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$tmp"
[ -s "$tmp" ] || { echo "Backup rong; dung." >&2; exit 1; }
file="$BACKUP_DIR/$(basename "$tmp" | sed 's/^\.//').dump"
mv "$tmp" "$file"
chmod 600 "$file"
printf 'Backup created: %s
' "$file"
echo "Can ma hoa, sao chep ra NGOAI VPS va thu restore rieng."
