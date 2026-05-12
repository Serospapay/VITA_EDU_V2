#!/usr/bin/env bash
# Відновлення з vita-edu-*.dump (формат custom)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR/.." && pwd)"
DUMP="${1:-}"
ENVFILE="${2:-$REPO/backend/.env}"
CREATE_DB="${CREATE_DB:-0}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 path/to/vita-edu-xxxx.dump [path/to/.env]" >&2
  exit 1
fi

TMP="$(mktemp)"
node "$DIR/lib/parse-database-url.mjs" "$ENVFILE" >"$TMP"
trap 'rm -f "$TMP"' EXIT

USER="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.user)" "$TMP")"
export PGPASSWORD="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.password)" "$TMP")"
HOST="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.host)" "$TMP")"
PORT="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.port)" "$TMP")"
DB="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.database)" "$TMP")"

if [[ "$CREATE_DB" == "1" ]]; then
  EXISTS="$(psql -h "$HOST" -p "$PORT" -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'")"
  EXISTS="$(echo "$EXISTS" | tr -d '[:space:]')"
  if [[ "$EXISTS" != "1" ]]; then
    psql -h "$HOST" -p "$PORT" -U "$USER" -d postgres -c "CREATE DATABASE \"$DB\";"
  fi
fi

pg_restore -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" \
  --verbose --clean --if-exists --no-owner --no-acl "$DUMP"
unset PGPASSWORD
echo "✅ Готово."
