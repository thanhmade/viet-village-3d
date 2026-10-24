#!/bin/sh
# Prepare local-only staging secrets. Does not start Docker or contact a VPS.
set -eu
cd "$(dirname "$0")"
command -v openssl >/dev/null 2>&1 || { echo "Can cai openssl." >&2; exit 1; }
[ ! -e .env ] || { echo "Da co .env; khong ghi de." >&2; exit 1; }
umask 077
password=$(openssl rand -hex 32)
[ "${#password}" -eq 64 ] || exit 1
# Hex characters are safe in both a PostgreSQL URL and this sed substitution.
# noclobber also prevents overwriting a file created concurrently.
(set -C; sed "s/CHANGE_TO_RANDOM_PASSWORD/$password/g" .env.example > .env)
chmod 600 .env
unset password
echo "Da tao .env cho staging (0600). Khong chia se hoac commit tep nay."
echo "Google, SMTP va R2 van chua cau hinh; chua khoi dong dich vu."
