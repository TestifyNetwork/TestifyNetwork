#!/usr/bin/env bash
# Runs the Deno test suite against a real local Supabase stack (Docker).
#
# The DB is reset to a clean migrations-only baseline before the run (so
# tests aren't affected by whatever local dev data happens to be sitting in
# the database) and reset again afterwards via an EXIT trap, so it happens
# whether the tests pass, fail, or the script is interrupted.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! supabase status >/dev/null 2>&1; then
  echo "Local Supabase stack isn't running — starting it..."
  supabase start
fi

echo "Resetting local Supabase database (pre-test baseline)..."
supabase db reset

reset_db_on_exit() {
  echo "Resetting local Supabase database (post-test cleanup)..."
  supabase db reset >/dev/null
}
trap reset_db_on_exit EXIT

# `-o env` also prints notices (stopped-service warnings, update notices) that
# aren't KEY="value" lines — filter to only real assignments before eval'ing.
eval "$(supabase status -o env | grep -E '^[A-Z_][A-Z0-9_]*=')"

export SUPABASE_URL="$API_URL"
export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SECRET_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

deno test --no-check --allow-env --allow-net supabase/functions/tests/
