#!/bin/sh
# Read-only checks; no build, deployment, or migration.
set -eu
cd "$(dirname "$0")"
branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
[ "$branch" = "vps-deploy" ] || { echo "Chi chay tu nhanh vps-deploy." >&2; exit 1; }
[ -f .env ] || { echo "Chay: sh init-env.sh" >&2; exit 1; }
if grep -q 'CHANGE_TO_RANDOM_PASSWORD' .env; then
  echo "Chua thay mat khau mau." >&2; exit 1
fi
grep -qx 'NODE_ENV=development' .env || { echo "Bo nay chi danh cho staging development." >&2; exit 1; }
grep -qx 'COOKIE_SECURE=false' .env || { echo "Cau hinh localhost can COOKIE_SECURE=false; chua ho tro public TLS." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Chua cai Docker." >&2; exit 1; }
docker compose version >/dev/null
docker compose --env-file .env config --quiet
echo "Cau hinh hop le de thu staging. CHUA build/chay/migrate; CHUA duyet production."
