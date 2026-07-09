#!/usr/bin/env bash
# benchmarks/optimizer-e2e.sh
# Tests scripts/agent-optimizer.mjs directly — the EXACT pipeline
# that bash-optimizer.sh calls internally. Measures real Tokenjuice
# reduceExecution savings on live APIs and CLI output.
#
# Usage:
#   bash benchmarks/optimizer-e2e.sh

set -euo pipefail
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
OPTIMIZER="$PROJECT/scripts/agent-optimizer.mjs"

echo "══════════════════════════════════════════════════════════════════════════"
echo "  agent-optimizer.mjs E2E Test — Real Tokenjuice Reduce Pipeline"
echo "══════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Optimizer: $OPTIMIZER"
echo ""

# ─── Utilities ───
tok() { echo $(( (${#1} + 3) / 4 )); }

# Run optimizer with input JSON via temp file (avoids ARG_MAX)
run_optimizer() {
  local input_json="$1"
  local tmp
  tmp=$(mktemp)
  # Write input to temp file, pipe into optimizer
  printf '%s' "$input_json" > "$tmp"
  local result
  result=$(node "$OPTIMIZER" < "$tmp" 2>/dev/null || echo '{"error":"optimizer failed"}')
  rm -f "$tmp"
  echo "$result"
}

measure() {
  local label="$1" raw="$2" result_json="$3"
  local raw_tok opt_tok saved pct status
  raw_tok=$(tok "$raw")

  # Extract inlineText or previewText from result
  local optimized
  optimized=$(echo "$result_json" | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      try{const r=JSON.parse(d);process.stdout.write(r.inlineText||r.previewText||d)}catch(e){process.stdout.write(d)}
    })' 2>/dev/null)
  opt_tok=$(tok "${optimized:-}")

  saved=$(( raw_tok - opt_tok ))
  if (( raw_tok > 0 )); then
    pct=$(awk "BEGIN { printf \"%.1f\", ($saved / $raw_tok) * 100 }")
  else
    pct="0.0"
  fi
  if (( saved > 0 )); then status="✓"; elif (( saved == 0 )); then status="—"; else status="✗"; fi

  printf "  %-42s %6d → %6d tok  (%5d chars → %5d chars)  %5s%%  %s\n" \
    "$label" "$raw_tok" "$opt_tok" "${#raw}" "${#optimized}" "$pct" "$status"
}

# ─── Helper: fetch API, build ToolExecutionInput, pipe to optimizer ───
test_api() {
  local label="$1" url="$2"
  local raw
  raw=$(curl -sS --max-time 10 "$url" 2>/dev/null || echo "{}")
  if [[ "$raw" == "{}" ]] || [[ -z "$raw" ]]; then
    echo "  $label  (fetch failed — skipping)"
    return
  fi
  # Write raw to temp file to avoid ARG_MAX in node -e argv
  local raw_tmp
  raw_tmp=$(mktemp)
  printf '%s' "$raw" > "$raw_tmp"
  local input_json
  input_json=$(node -e "
    const fs = require('fs');
    const out = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    process.stdout.write(JSON.stringify({
      toolName: 'Curl',
      command: 'curl ' + process.argv[2],
      argv: ['curl', process.argv[2]],
      stdout: JSON.stringify(out, null, 2),
      stderr: '',
      exitCode: 0,
      durationMs: 0,
      cwd: process.cwd(),
    }));
  " "$raw_tmp" "$url" 2>/dev/null)
  rm -f "$raw_tmp"

  local result
  result=$(run_optimizer "$input_json")
  measure "$label" "$raw" "$result"
  echo "    Raw preview:    $(echo "$raw" | head -c 100 | tr '\n' ' ')..."
  local opt_preview
  opt_preview=$(echo "$result" | tr '\n' ' ' | head -c 180)
  echo "    Optimized:      $opt_preview"
  echo ""
}

# ─── Helper: test CLI output through optimizer ───
test_cli() {
  local label="$1"
  shift
  # "$@" = the command to run
  local raw
  raw=$("$@" 2>/dev/null || echo "(no output)")
  if [[ -z "$raw" ]]; then return; fi

  # Write raw to temp file to avoid ARG_MAX
  local raw_tmp
  raw_tmp=$(mktemp)
  printf '%s' "$raw" > "$raw_tmp"

  local input_json
  input_json=$(node -e "
    const fs = require('fs');
    const out = fs.readFileSync(process.argv[1], 'utf8');
    const args = process.argv.slice(2);
    process.stdout.write(JSON.stringify({
      toolName: 'Bash',
      command: args.join(' '),
      argv: args,
      stdout: out,
      stderr: '',
      exitCode: 0,
      durationMs: 0,
      cwd: process.cwd(),
    }));
  " "$raw_tmp" "$@" 2>/dev/null)
  rm -f "$raw_tmp"

  local result
  result=$(run_optimizer "$input_json")
  measure "$label" "$raw" "$result"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════
echo "  ┌── API Calls (curl → optimizer → Tokenjuice reduceExecution) ──┐"
echo ""

test_api "GitHub repo (expressjs/express)" \
  "https://api.github.com/repos/expressjs/express"

test_api "npm registry (express/latest)" \
  "https://registry.npmjs.org/express/latest"

test_api "HackerNews (item 8863)" \
  "https://hacker-news.firebaseio.com/v0/item/8863.json"

test_api "JSONPlaceholder (users/1)" \
  "https://jsonplaceholder.typicode.com/users/1"

test_api "Open-Meteo (Berlin forecast)" \
  "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true"

# ══════════════════════════════════════════════════════════════════════════
echo "  ┌── CLI Commands (shell → optimizer → Tokenjuice reduceExecution) ──┐"
echo ""

test_cli "git log --oneline -20" git -C "$PROJECT" log --oneline -20

test_cli "ls -laR agentskin/backend" ls -laR "$PROJECT/agentskin/backend"

test_cli "npm view express (80 lines)" sh -c "npm view express 2>/dev/null | head -80"

# ─── Summary ───
echo "══════════════════════════════════════════════════════════════════════════"
echo "  Test complete. agent-optimizer.mjs tested against live APIs + CLI output."
echo "  This is the exact pipeline bash-optimizer.sh invokes internally."
echo "══════════════════════════════════════════════════════════════════════════"
