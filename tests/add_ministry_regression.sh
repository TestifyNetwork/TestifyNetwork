#!/usr/bin/env bash
# Regression test for add_ministry edge function.
# For each ministry: checks if it already exists in the DB, calls the edge function,
# then asserts the correct response. New rows are polled until complete, then deleted.
#
# Usage:
#   ./tests/add_ministry_regression.sh             # hits deployed function
#   LOCAL=1 ./tests/add_ministry_regression.sh     # hits local supabase dev server

set -euo pipefail

PUBLISHABLE_KEY="sb_publishable_AAHOHAHBpgtHBCsLslwZ8w_Y21Nuxmy"

if [[ "${LOCAL:-0}" == "1" ]]; then
  # Requires: supabase start && supabase functions serve add_ministry --env-file ./supabase/.env.local
  FUNCTIONS_URL="http://localhost:54321/functions/v1"
  REST_URL="http://localhost:54321/rest/v1"
  AUTH_KEY="${LOCAL_ANON_KEY:-${PUBLISHABLE_KEY}}"
else
  FUNCTIONS_URL="https://fyngtvccgxbbyjvckdcf.supabase.co/functions/v1"
  REST_URL="https://fyngtvccgxbbyjvckdcf.supabase.co/rest/v1"
  AUTH_KEY="${PUBLISHABLE_KEY}"
fi


# ── Ministry list ─────────────────────────────────────────────────────────────
# Format: "Ministry Name|identifiable fact"
MINISTRIES=(
  "CRU|the campus ministry"
  "World Vision|the one that helps children in Africa"
  "Samaritan's Purse|the one that delivers Christmas shoe boxes"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

db_query_by_name() {
  # Usage: db_query_by_name <ministry_name>
  # Returns JSON rows from ministry_reports matching the name
  local name="$1"
  local encoded
  encoded=$(python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$name")
  curl --silent \
    --header "apikey: ${AUTH_KEY}" \
    --header "Authorization: Bearer ${AUTH_KEY}" \
    --header "Accept: application/json" \
    "${REST_URL}/ministry_reports?ministry_name=ilike.${encoded}&select=ministry_id,ministry_name,status"
}

db_query_by_id() {
  # Usage: db_query_by_id <ministry_id>
  # Returns the JSON row for a specific ministry_id
  local id="$1"
  curl --silent \
    --header "apikey: ${AUTH_KEY}" \
    --header "Authorization: Bearer ${AUTH_KEY}" \
    --header "Accept: application/json" \
    "${REST_URL}/ministry_reports?ministry_id=eq.${id}&select=ministry_id,ministry_name,status"
}

db_delete() {
  # Usage: db_delete <ministry_id>
  local id="$1"
  curl --silent --output /dev/null \
    --request DELETE \
    --header "apikey: ${AUTH_KEY}" \
    --header "Authorization: Bearer ${AUTH_KEY}" \
    "${REST_URL}/ministry_reports?ministry_id=eq.${id}"
}

call_edge_function() {
  # Usage: call_edge_function <ministry_name> <identifiable_fact>
  # Writes body to /tmp/reg_body and prints the HTTP status code
  local name="$1"
  local fact="$2"
  curl --silent --show-error --max-time 30 \
    --output /tmp/reg_body \
    --write-out "%{http_code}" \
    --request POST "${FUNCTIONS_URL}/add_ministry" \
    --header "Content-Type: application/json" \
    --header "Authorization: Bearer ${AUTH_KEY}" \
    --header "apikey: ${AUTH_KEY}" \
    --data "{\"ministryName\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$name"), \"identifiableFact\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$fact")}"
}

PASS=0
FAIL=0

# ── Run tests ─────────────────────────────────────────────────────────────────

for entry in "${MINISTRIES[@]}"; do
  IFS='|' read -r MINISTRY_NAME IDENTIFIABLE_FACT <<< "$entry"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Ministry: ${MINISTRY_NAME}"
  echo "Fact:     ${IDENTIFIABLE_FACT}"
  echo ""

  # 1. Check if ministry already exists in the database
  DB_RESULT=$(db_query_by_name "$MINISTRY_NAME")
  ALREADY_EXISTS=false
  if echo "$DB_RESULT" | grep -q '"ministry_id"'; then
    ALREADY_EXISTS=true
    EXISTING_ID=$(echo "$DB_RESULT" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['ministry_id'])")
    echo "Found existing row in DB (id: ${EXISTING_ID})"
  else
    echo "Not found in DB — expecting successful add"
  fi

  # 2. Call the edge function
  HTTP_STATUS=$(call_edge_function "$MINISTRY_NAME" "$IDENTIFIABLE_FACT")
  HTTP_BODY=$(cat /tmp/reg_body)
  echo "Status: ${HTTP_STATUS}"
  echo "Body:   ${HTTP_BODY}"

  # 3. Assert correct behavior based on whether the row pre-existed
  if [[ "$ALREADY_EXISTS" == "true" ]]; then
    if [[ "$HTTP_STATUS" == "409" ]]; then
      echo "PASS: duplicate correctly rejected with 409"
      ((PASS++))
    else
      echo "FAIL: expected 409 for duplicate, got ${HTTP_STATUS}"
      ((FAIL++))
    fi

  else
    # New ministry — expect 202
    if [[ "$HTTP_STATUS" != "202" ]]; then
      echo "FAIL: expected HTTP 202, got ${HTTP_STATUS}"
      ((FAIL++))
      continue
    fi

    if ! echo "$HTTP_BODY" | grep -q "ministry_id"; then
      echo "FAIL: response body missing 'ministry_id'"
      ((FAIL++))
      continue
    fi

    NEW_ID=$(echo "$HTTP_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['ministry_id'])")
    echo "Row created with id: ${NEW_ID}"

    # 4. Poll every 10 seconds until status = not_verified (background task complete)
    echo "Waiting for background task to complete (polling every 10s)..."
    POLL_LIMIT=30  # 30 × 10s = 5 minutes max
    POLL_COUNT=0
    COMPLETED=false

    while [[ $POLL_COUNT -lt $POLL_LIMIT ]]; do
      sleep 10
      ((POLL_COUNT++))
      POLL_RESULT=$(db_query_by_id "$NEW_ID")
      ROW_STATUS=$(echo "$POLL_RESULT" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['status'] if data else 'missing')" 2>/dev/null || echo "missing")
      echo "  [${POLL_COUNT}] status: ${ROW_STATUS}"

      if [[ "$ROW_STATUS" == "not_verified" ]]; then
        COMPLETED=true
        break
      elif [[ "$ROW_STATUS" == "error" ]]; then
        echo "FAIL: background task set row status to error"
        ((FAIL++))
        db_delete "$NEW_ID"
        echo "Test row deleted"
        continue 2
      fi
    done

    if [[ "$COMPLETED" == "true" ]]; then
      echo "Background task completed successfully"
      # 5. Delete the test row
      db_delete "$NEW_ID"
      echo "Test row deleted"
      echo "PASS"
      ((PASS++))
    else
      echo "FAIL: background task did not complete within timeout"
      ((FAIL++))
    fi
  fi

  echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: ${PASS} passed, ${FAIL} failed"
[[ $FAIL -eq 0 ]]
