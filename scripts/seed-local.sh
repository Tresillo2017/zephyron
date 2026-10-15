#!/usr/bin/env bash
# LOCAL ONLY visual-QA seed. Never uses --remote.
#
# Usage: scripts/seed-local.sh     (dev server must be running: LOCAL_ONLY=1 bun run dev)
#
# QA login (throwaway, local DB only):
#   email:    qa@zephyron.test
#   password: $QA_PASSWORD (env; defaults to a value derived from the email, local DB only)
#   role:     admin, email verified
#   invite:   QA-BETA-2026
#
# Steps: local auth schema fix (if needed) -> seed SQL -> register QA user via
# /api/auth/sign-up/email (if missing) -> seed SQL again (user-owned rows) ->
# copy placeholder cover images into local R2 (zephyron-audio, qa-seed/ keys).
set -euo pipefail

cd "$(dirname "$0")/.."
DIR="scripts"
BASE="${BASE_URL:-http://localhost:5173}"
QA_EMAIL="qa@zephyron.test"
QA_PASSWORD="${QA_PASSWORD:-qa-$(printf zephyron-local | sha256sum | cut -c1-12)}"
QA_INVITE="QA-BETA-2026"
BUCKET="zephyron-audio"
WR=(bunx wrangler --config wrangler.jsonc)

for arg in "$@"; do
  [[ "$arg" == *remote* ]] && { echo "refusing: this script is local-only" >&2; exit 1; }
done

# Run a local-only D1 query and print the first result row count (0/1) for a yes/no check.
local_count() {
  "${WR[@]}" d1 execute DB --local --json --command "$1" 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s)[0].results;console.log(r.length?Object.values(r[0])[0]:0)})'
}

run_sql() {
  "${WR[@]}" d1 execute DB --local --file="$DIR/$1" >/dev/null
  echo "applied $1"
}

echo "== 1. local auth schema fix"
if [[ "$(local_count "SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='twoFactorEnabled'")" == "0" ]]; then
  run_sql seed-local-authfix.sql
else
  echo "already applied"
fi

echo "== 2. seed SQL (pass 1)"
run_sql seed-local.sql

echo "== 3. QA user"
if [[ "$(local_count "SELECT COUNT(*) FROM user WHERE email='$QA_EMAIL'")" == "0" ]]; then
  body=$(printf '{"name":"QA Admin","email":"%s","password":"%s","inviteCode":"%s"}' "$QA_EMAIL" "$QA_PASSWORD" "$QA_INVITE")
  status=$(curl -sS -o /tmp/qa-signup.json -w '%{http_code}' -X POST "$BASE/api/auth/sign-up/email" \
    -H 'content-type: application/json' -H "origin: $BASE" -d "$body") || status=000
  if [[ "$status" != "200" ]]; then
    echo "sign-up failed (HTTP $status): $(cat /tmp/qa-signup.json)" >&2
    echo "Is the dev server running on $BASE with LOCAL_ONLY=1? See /tmp/dev.log" >&2
    exit 1
  fi
  echo "registered $QA_EMAIL"
else
  echo "$QA_EMAIL exists"
fi

echo "== 4. seed SQL (pass 2, user-owned rows + admin promotion)"
run_sql seed-local.sql

echo "== 5. placeholder covers into local R2"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
covers=()
for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16; do
  covers+=("qa-seed/set-$(printf %02d "$n").jpg|https://picsum.photos/seed/zeph-set-$(printf %02d "$n")/600/600")
done
for n in 1 2 3 4; do
  covers+=("qa-seed/event-$(printf %02d "$n").jpg|https://picsum.photos/seed/zeph-event-$(printf %02d "$n")/800/800")
done
for entry in "${covers[@]}"; do
  key="${entry%%|*}"; url="${entry#*|}"
  f="$tmp/$(basename "$key")"
  curl -sSfL -o "$f" "$url"
  "${WR[@]}" r2 object put "$BUCKET/$key" --local --file="$f" --content-type image/jpeg >/dev/null
done
echo "uploaded ${#covers[@]} covers"

echo "done. login: $QA_EMAIL / $QA_PASSWORD"
