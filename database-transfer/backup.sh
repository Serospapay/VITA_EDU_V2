#!/usr/bin/env bash
# Резервна копія PostgreSQL (DATABASE_URL з backend/.env)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR/.." && pwd)"
ENVFILE="${1:-$REPO/backend/.env}"
FMT="${FORMAT:-custom}" # custom | plain

TMP="$(mktemp)"
node "$DIR/lib/parse-database-url.mjs" "$ENVFILE" >"$TMP"
trap 'rm -f "$TMP"' EXIT

USER="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.user)" "$TMP")"
export PGPASSWORD="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.password)" "$TMP")"
HOST="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.host)" "$TMP")"
PORT="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.port)" "$TMP")"
DB="$(node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); process.stdout.write(j.database)" "$TMP")"

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR/backups"
if [[ "$FMT" == "plain" ]]; then
  OUT="$DIR/backups/vita-edu-$STAMP.sql"
  pg_dump -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" --no-owner --no-privileges -f "$OUT"
else
  OUT="$DIR/backups/vita-edu-$STAMP.dump"
  pg_dump -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -F c -b -v -f "$OUT"
fi
unset PGPASSWORD
echo "✅ Створено: $OUT"
