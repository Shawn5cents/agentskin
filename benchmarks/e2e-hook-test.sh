#!/usr/bin/env bash
# benchmarks/e2e-hook-test.sh
# End-to-end test: curl live APIs, simulate the bash hook pipeline, measure savings.
# Mirrors what bash-optimizer.sh does internally but without requiring preexec.

set -euo pipefail
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

echo "══════════════════════════════════════════════════════════════════════════"
echo "  Bash Hook E2E Test — Live API Optimization Pipeline"
echo "══════════════════════════════════════════════════════════════════════════"
echo ""

# ─── Utilities ───
tok() { echo $(( (${#1} + 3) / 4 )); }

measure() {
  local label="$1" raw="$2" optimized="$3"
  local raw_chars=${#raw} opt_chars=${#optimized}
  local raw_tok opt_tok saved_tok pct
  raw_tok=$(tok "$raw")
  opt_tok=$(tok "$optimized")
  saved_tok=$(( raw_tok - opt_tok ))
  if (( raw_tok > 0 )); then
    pct=$(awk "BEGIN { printf \"%.1f\", ($saved_tok / $raw_tok) * 100 }")
  else
    pct="0.0"
  fi
  # Determine status
  local status="✓"
  if (( saved_tok <= 0 )); then status="—"; fi
  printf "  %-42s %6d → %6d tok  %6s chars  %5s%%  %s\n" \
    "$label" "$raw_tok" "$opt_tok" "${raw_chars}→${opt_chars}" "$pct" "$status"
}

# ─── Run skin pipeline (same as bash hook calls internally) ───
optimize_json() {
  local url="$1" raw="$2"
  node -e "
    import('$PROJECT/agentskin/backend/lib/skin-engine.js').then(m => {
      try {
        const data = JSON.parse(process.argv[1]);
        const result = m.skin(data, { url: process.argv[2], stripAnsiCodes: true });
        process.stdout.write(result.skin || JSON.stringify(data));
      } catch(e) {
        process.stdout.write(process.argv[1]);
      }
    });
  " "$raw" "$url" 2>/dev/null
}

optimize_cli() {
  local raw="$1"
  node -e "
    import('$PROJECT/agentskin/backend/lib/text-utils.js').then(m => {
      let s = m.stripAnsi(process.argv[1]);
      // Collapse repeated lines (mirrors reduceCli)
      const lines = s.split('\n');
      const out = [];
      let prev = null, run = 0;
      for (const line of lines) {
        if (line === prev) { run++; continue; }
        if (run > 0) { out.push('[×' + run + ']'); run = 0; }
        out.push(line);
        prev = line;
      }
      if (run > 0) out.push('[×' + run + ']');
      // Clamp to 200 lines
      if (out.length > 200) {
        out.length = 200;
        out.push('[truncated ' + (lines.length - 200) + ' lines]');
      }
      process.stdout.write(out.join('\n'));
    });
  " "$raw" 2>/dev/null
}

echo "  ┌── API Calls (curl → AgentSkin pipeline) ──┐"
echo ""

# ─── GitHub repo API ───
echo "  Fetching GitHub API..."
GH_RAW=$(curl -sS --max-time 10 "https://api.github.com/repos/Shawn5cents/agentskin" 2>/dev/null || echo '{}')
GH_OPT=$(optimize_json "https://api.github.com/repos/Shawn5cents/agentskin" "$GH_RAW")
measure "GitHub repo (agentskin)" "$GH_RAW" "$GH_OPT"
echo "    Raw preview:    $(echo "$GH_RAW" | head -c 120)..."
echo "    Optimized:      $(echo "$GH_OPT" | head -c 200)"
echo ""

# ─── npm registry API ───
echo "  Fetching npm API..."
NPM_RAW=$(curl -sS --max-time 10 "https://registry.npmjs.org/express/latest" 2>/dev/null || echo '{}')
NPM_OPT=$(optimize_json "https://registry.npmjs.org/express/latest" "$NPM_RAW")
measure "npm registry (express)" "$NPM_RAW" "$NPM_OPT"
echo "    Raw preview:    $(echo "$NPM_RAW" | head -c 120)..."
echo "    Optimized:      $(echo "$NPM_OPT" | head -c 200)"
echo ""

# ─── HackerNews API ───
echo "  Fetching HackerNews API..."
HN_RAW=$(curl -sS --max-time 10 "https://hacker-news.firebaseio.com/v0/item/8863.json" 2>/dev/null || echo '{}')
HN_OPT=$(optimize_json "https://hacker-news.firebaseio.com/v0/item/8863.json" "$HN_RAW")
measure "HackerNews (item 8863)" "$HN_RAW" "$HN_OPT"
echo "    Raw preview:    $(echo "$HN_RAW" | head -c 120)..."
echo "    Optimized:      $(echo "$HN_OPT" | head -c 200)"
echo ""

# ─── JSONPlaceholder API ───
echo "  Fetching JSONPlaceholder..."
JP_RAW=$(curl -sS --max-time 10 "https://jsonplaceholder.typicode.com/users/1" 2>/dev/null || echo '{}')
JP_OPT=$(optimize_json "https://jsonplaceholder.typicode.com/users/1" "$JP_RAW")
measure "JSONPlaceholder (user 1)" "$JP_RAW" "$JP_OPT"
echo "    Raw preview:    $(echo "$JP_RAW" | head -c 120)..."
echo "    Optimized:      $(echo "$JP_OPT" | head -c 200)"
echo ""

echo "  ┌── CLI Commands (simulated bash hook) ──┐"
echo ""

# ─── git log ───
echo "  Running git log..."
GIT_RAW=$(cd "$PROJECT" && git log --oneline -20 2>/dev/null || echo "(no git)")
GIT_OPT=$(optimize_cli "$GIT_RAW")
measure "git log --oneline -20" "$GIT_RAW" "$GIT_OPT"
echo ""

# ─── ls -la (large dir) ───
echo "  Running ls -laR (agentskin backend)..."
LS_RAW=$(ls -laR "$PROJECT/agentskin/backend/" 2>/dev/null | head -100 || echo "(no dir)")
LS_OPT=$(optimize_cli "$LS_RAW")
measure "ls -laR agentskin/backend" "$LS_RAW" "$LS_OPT"
echo ""

# ─── npm view ───
echo "  Running npm view express..."
NPMV_RAW=$(npm view express 2>/dev/null | head -80 || echo "(npm not available)")
NPMV_OPT=$(optimize_cli "$NPMV_RAW")
measure "npm view express" "$NPMV_RAW" "$NPMV_OPT"
echo ""

# ─── Summary ───
echo "══════════════════════════════════════════════════════════════════════════"
echo "  E2E test complete. Run without live APIs? Use benchmarks/full-stack-bench.mjs"
echo "══════════════════════════════════════════════════════════════════════════"
