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

# Load PERPLEXITY_KEY from .env.keys
if [[ -f ".env.keys" ]]; then
  PERPLEXITY_API_KEY=$(grep '^PERPLEXITY_KEY=' .env.keys | cut -d'=' -f2-)
else
  echo "Warning: .env.keys not found, report comparison will be skipped"
  PERPLEXITY_API_KEY=""
fi

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
# Format: "Ministry Name|identifiable fact|expected report file"
MINISTRIES=(
  "CRU|the campus ministry|tests/expected_reports/CRU.md"
  "World Vision|the one that helps children in Africa|tests/expected_reports/World Vision.md"
  "Samaritan's Purse|the one that delivers Christmas shoe boxes|tests/expected_reports/Samaritans Purse.md"
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

db_fetch_report() {
  # Usage: db_fetch_report <ministry_id>
  # Returns the generated_report text for a specific ministry_id
  local id="$1"
  curl --silent \
    --header "apikey: ${AUTH_KEY}" \
    --header "Authorization: Bearer ${AUTH_KEY}" \
    --header "Accept: application/json" \
    "${REST_URL}/ministry_reports?ministry_id=eq.${id}&select=generated_report" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['generated_report'] if data else '')"
}

compare_reports_with_perplexity() {
  # Usage: compare_reports_with_perplexity <generated_report> <expected_report_file>
  # Returns "PASS" or "FAIL: <reason>" on stdout
  local generated="$1"
  local expected
  expected=$(cat "$2")
  local perplexity_key="${PERPLEXITY_API_KEY:-}"

  if [[ -z "$perplexity_key" ]]; then
    echo "SKIP: PERPLEXITY_API_KEY not set"
    return
  fi

  local prompt
  prompt=$(python3 -c "
import json, sys
generated = sys.argv[1]
expected = sys.argv[2]
prompt = (
  'You are evaluating two nonprofit ministry research reports. '
  'Compare the GENERATED report to the EXPECTED report and determine if they are equivalent. '
  'Evaluate on ALL of the following criteria:\n'
  '1. SECTIONS: Do both reports contain all the same sections (e.g. Mission, History, Leadership, Financials, Red Flags, etc.)?\n'
  '2. CONTENT: Is the general content in each section the same (same key facts, figures, and findings — minor wording differences are acceptable)?\n'
  '3. CITATIONS: Does the generated report include inline citations with URLs, as the expected report does?\n'
  '4. FORMAT: Is the generated report formatted in Markdown (not HTML)? Does it use the same structural elements (tables, headers, bullet points)?\n'
  '5. KEY FACTS: Are critical specific facts correct — such as EIN, founding year, headquarters address, president name, and any financial figures?\n\n'
  'Respond with PASS or FAIL on the first line only. '
  'On the following lines, provide a brief explanation of your evaluation regardless of whether it passed or failed.\n\n'
  '<EXPECTED REPORT>\n' + expected + '\n</EXPECTED REPORT>\n\n'
  '<GENERATED REPORT>\n' + generated + '\n</GENERATED REPORT>'
)
print(json.dumps({'model': 'sonar', 'messages': [{'role': 'user', 'content': prompt}]}))
" "$generated" "$expected")

  local response
  response=$(curl --silent --max-time 60 \
    --request POST "https://api.perplexity.ai/chat/completions" \
    --header "Authorization: Bearer ${perplexity_key}" \
    --header "Content-Type: application/json" \
    --data "$prompt")

  python3 -c "
import sys, json
data = json.loads(sys.argv[1])
content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
lines = content.split('\n')
verdict = lines[0].strip()
explanation = '\n'.join(lines[1:]).strip()
print(verdict)
if explanation:
    print(explanation)
" "$response"
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
  IFS='|' read -r MINISTRY_NAME IDENTIFIABLE_FACT EXPECTED_REPORT_FILE <<< "$entry"

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

      # 5. Compare generated report against expected using Perplexity
      if [[ -f "$EXPECTED_REPORT_FILE" ]]; then
        echo "Comparing generated report against ${EXPECTED_REPORT_FILE}..."
        GENERATED_REPORT=$(db_fetch_report "$NEW_ID")
        COMPARISON=$(compare_reports_with_perplexity "$GENERATED_REPORT" "$EXPECTED_REPORT_FILE")
        COMPARISON_VERDICT=$(echo "$COMPARISON" | head -n 1)
        COMPARISON_EXPLANATION=$(echo "$COMPARISON" | tail -n +2)
        echo "Report comparison: ${COMPARISON_VERDICT}"
        if [[ -n "$COMPARISON_EXPLANATION" ]]; then
          echo "$COMPARISON_EXPLANATION"
        fi
        if [[ "$COMPARISON_VERDICT" != "PASS" ]]; then
          echo "FAIL: report comparison failed"
          ((FAIL++))
          db_delete "$NEW_ID"
          echo "Test row deleted"
          continue
        fi
      else
        echo "No expected report file found at ${EXPECTED_REPORT_FILE}, skipping comparison"
      fi

      # 6. Delete the test row
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
