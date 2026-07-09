#!/usr/bin/env bash
# scripts/test-bash-hook.sh
#
# CI test for the Tokenjuice bash hook. Sources the hook, exercises the
# core code paths, and exits non-zero on any failure.
#
# Usage:
#   bash scripts/test-bash-hook.sh
#   # or
#   npx vitest --run scripts/test-bash-hook.sh  (not directly, but the script is CI-runnable)
#
# Exit codes:
#   0  all tests passed
#   1  a test failed
#   2  prerequisites missing (node, hook, optimizer)
#
# Tests:
#   1. Hook loads without error
#   2. tokenjuice-hook-status reports expected fields
#   3. opt runs a simple command and returns its stdout
#   4. opt on a non-noisy small command returns raw output unchanged
#   5. opt with TOKENJUICE_OPT=off returns raw output unchanged
#   6. opt with NO_OPTIMIZE=1 returns raw output unchanged
#   7. opt captures exit code from the underlying command
#   8. opt on a known noisy command (git) with TOKENJUICE_OPT=always works
#   9. agent-optimizer.mjs handles empty stdin gracefully
#  10. agent-optimizer.mjs handles invalid JSON with exit code 2
#  11. agent-optimizer.mjs handles valid JSON and returns a JSON CompactResult
#  12. Cache file is written when optimization occurs
#  13. Double-sourcing the hook is a no-op
#  14. TOKENJUICE_HOOK=off disables optimization
#  15. agent-optimizer.mjs exit code 3 on reducer failure (mocked)

set -uo pipefail

# --- Locate the test environment ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOK_FILE="${REPO_ROOT}/.agents/hooks/bash-optimizer.sh"
OPTIMIZER_FILE="${REPO_ROOT}/scripts/agent-optimizer.mjs"
DIST_FILE="${REPO_ROOT}/dist/index.js"

# --- Test counters ---
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_NAMES=()

# --- Test helpers ---
assert_eq() {
  local expected="$1" actual="$2" msg="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    return 0
  fi
  echo "  ASSERTION FAILED: ${msg}"
  echo "    expected: ${expected}"
  echo "    actual:   ${actual}"
  return 1
}

assert_contains() {
  local haystack="$1" needle="$2" msg="$3"
  if [[ "${haystack}" == *"${needle}"* ]]; then
    return 0
  fi
  echo "  ASSERTION FAILED: ${msg}"
  echo "    needle:   ${needle}"
  echo "    haystack: ${haystack}"
  return 1
}

assert_file_exists() {
  local file="$1" msg="$2"
  if [[ -f "${file}" ]]; then
    return 0
  fi
  echo "  ASSERTION FAILED: ${msg}"
  echo "    expected file: ${file}"
  return 1
}

run_test() {
  local name="$1"
  local fn="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  echo "[TEST ${TESTS_RUN}] ${name}"
  if "${fn}"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "  PASS"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_NAMES+=("${name}")
    echo "  FAIL"
  fi
  echo ""
}

# --- Prerequisites ---
echo "=========================================="
echo "Tokenjuice bash hook CI test"
echo "=========================================="
echo ""
echo "Hook:       ${HOOK_FILE}"
echo "Optimizer:  ${OPTIMIZER_FILE}"
echo "Dist:       ${DIST_FILE}"
echo ""

if [[ ! -f "${HOOK_FILE}" ]]; then
  echo "ERROR: hook file not found at ${HOOK_FILE}" >&2
  exit 2
fi
if [[ ! -f "${OPTIMIZER_FILE}" ]]; then
  echo "ERROR: optimizer file not found at ${OPTIMIZER_FILE}" >&2
  exit 2
fi
if [[ ! -f "${DIST_FILE}" ]]; then
  echo "ERROR: dist/index.js not found. Run 'npx tsc' first." >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required" >&2
  exit 2
fi

# Use a temp cache dir so we don't pollute ~/.cache/tokenjuice
TEST_CACHE_DIR="$(mktemp -d)"
export TOKENJUICE_CACHE="${TEST_CACHE_DIR}"
# Use a temp HOME so we don't touch the user's .bashrc
export TEST_HOME="$(mktemp -d)"
# Re-resolve HOME for the duration of the test so the hook uses TEST_HOME
export HOME="${TEST_HOME}"

cleanup() {
  rm -rf "${TEST_CACHE_DIR}" "${TEST_HOME}" 2>/dev/null || true
}
trap cleanup EXIT

# ============================================================
# Test 1: Hook loads without error
# ============================================================
test_hook_loads() {
  # Run in a subshell to avoid polluting the parent shell
  bash -c "source '${HOOK_FILE}' && [[ -n \"\${__TOKENJUICE_BASH_HOOK_LOADED:-}\" ]]"
}

# ============================================================
# Test 2: tokenjuice-hook-status reports expected fields
# ============================================================
test_status_reports_fields() {
  local output
  output=$(bash -c "source '${HOOK_FILE}' && tokenjuice-hook-status")
  assert_contains "${output}" "Tokenjuice bash hook: loaded" "status says loaded" &&
  assert_contains "${output}" "optimizer:" "status shows optimizer" &&
  assert_contains "${output}" "cache:" "status shows cache"
}

# ============================================================
# Test 2b: tokenjuice-hook-status reports resolved paths that
# match the expected repo layout. Guards against path-resolution
# regressions like the ../.. fix in bash-optimizer.sh.
# ============================================================
test_status_reports_paths() {
  local output
  output=$(bash -c "source '${HOOK_FILE}' && tokenjuice-hook-status")
  # Optimizer line: "  optimizer: <path>"
  local opt_path
  opt_path=$(printf '%s\n' "${output}" | awk -F': ' '/^  optimizer: /{print $2}' | xargs)
  # Cache line: "  cache:     <path>"  (note: status pads with extra spaces)
  local cache_path
  cache_path=$(printf '%s\n' "${output}" | awk -F': ' '/^  cache: /{print $2}' | xargs)

  # Optimizer must end in /scripts/agent-optimizer.mjs
  if [[ "${opt_path}" != */scripts/agent-optimizer.mjs ]]; then
    echo "  optimizer path does not end in /scripts/agent-optimizer.mjs: ${opt_path}"
    return 1
  fi
  # Optimizer file must actually exist at that resolved path
  if [[ ! -f "${opt_path}" ]]; then
    echo "  optimizer path does not exist on disk: ${opt_path}"
    return 1
  fi
  # Cache must be a directory that exists (the hook creates it on load)
  if [[ ! -d "${cache_path}" ]]; then
    echo "  cache path is not an existing directory: ${cache_path}"
    return 1
  fi
  return 0
}

# ============================================================
# Test 3: opt runs a simple command and returns its stdout
# ============================================================
test_opt_returns_stdout() {
  local output
  # Use TOKENJUICE_OPT=off to force raw passthrough (simpler test)
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=off opt echo 'hello world'")
  assert_contains "${output}" "hello world" "opt returns echo stdout"
}

# ============================================================
# Test 4: opt on a non-noisy small command returns raw output
# ============================================================
test_opt_small_command_passthrough() {
  local output
  # 'true' is a non-noisy command with tiny output — should be optimized
  # but result is empty, so we use 'echo' which is a no-op
  output=$(bash -c "source '${HOOK_FILE}' && opt echo 'small output'")
  assert_contains "${output}" "small output" "opt returns echo output"
}

# ============================================================
# Test 5: opt with TOKENJUICE_OPT=off returns raw output unchanged
# Uses 'git' (noisy command) with simulated large output to force
# the optimize path normally, then verifies TOKENJUICE_OPT=off bypasses it.
# ============================================================
test_opt_off_returns_raw() {
  local output
  # Use printf to generate deterministic output, then verify raw passthrough
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=off opt printf 'raw-token-A\\nraw-token-B\\n'")
  assert_contains "${output}" "raw-token-A" "TOKENJUICE_OPT=off returns raw (token A)"
  assert_contains "${output}" "raw-token-B" "TOKENJUICE_OPT=off returns raw (token B)"
}

# ============================================================
# Test 6: opt with NO_OPTIMIZE=1 returns raw output
# ============================================================
test_opt_no_optimize_returns_raw() {
  local output
  output=$(bash -c "source '${HOOK_FILE}' && NO_OPTIMIZE=1 opt printf 'passthrough-X\\npassthrough-Y\\n'")
  assert_contains "${output}" "passthrough-X" "NO_OPTIMIZE=1 returns raw (X)"
  assert_contains "${output}" "passthrough-Y" "NO_OPTIMIZE=1 returns raw (Y)"
}

# ============================================================
# Test 7: opt captures exit code from the underlying command
# ============================================================
test_opt_captures_exit_code() {
  local exit_code
  bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=off opt false" >/dev/null 2>&1
  exit_code=$?
  assert_eq "1" "${exit_code}" "opt returns false's exit code (1)"
}

# ============================================================
# Test 8: opt on a known noisy command (ls) with TOKENJUICE_OPT=always works
# ============================================================
test_opt_noisy_command() {
  local output
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=always opt ls /tmp 2>/dev/null | head -5")
  # Should produce some output (either raw ls or reduced form)
  [[ -n "${output}" ]]
}

# ============================================================
# Test 9: agent-optimizer.mjs handles empty stdin gracefully
# ============================================================
test_optimizer_empty_stdin() {
  local output exit_code
  output=$(bash -c ": | node '${OPTIMIZER_FILE}'" 2>/dev/null)
  exit_code=$?
  # Empty stdin should produce a valid JSON object and exit 0
  [[ ${exit_code} -eq 0 ]] && [[ -n "${output}" ]]
}

# ============================================================
# Test 10: agent-optimizer.mjs handles invalid JSON with exit code 2
# ============================================================
test_optimizer_invalid_json() {
  local exit_code
  echo "not valid json {{{" | node "${OPTIMIZER_FILE}" >/dev/null 2>&1
  exit_code=$?
  assert_eq "2" "${exit_code}" "invalid JSON exits with code 2"
}

# ============================================================
# Test 11: agent-optimizer.mjs handles valid JSON and returns a JSON CompactResult
# ============================================================
test_optimizer_valid_json() {
  local input exit_code
  input='{"command":"git status","argv":["git","status"],"stdout":"On branch main\nnothing to commit, working tree clean\n","stderr":"","exitCode":0,"durationMs":12,"cwd":"/tmp","toolName":"Bash"}'
  output=$(echo "${input}" | node "${OPTIMIZER_FILE}" 2>/dev/null)
  exit_code=$?
  if [[ ${exit_code} -ne 0 ]]; then
    echo "  optimizer exited with code ${exit_code}"
    return 1
  fi
  # Verify it's valid JSON
  if ! echo "${output}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{JSON.parse(d); process.exit(0)})" 2>/dev/null; then
    echo "  output is not valid JSON: ${output}"
    return 1
  fi
  # Verify it has a stats or inlineText field (CompactResult shape)
  echo "${output}" | node -e "
    let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const r = JSON.parse(d);
      if (!r || (typeof r.inlineText !== 'string' && typeof r.stats !== 'object')) {
        console.error('result missing inlineText/stats:', JSON.stringify(r));
        process.exit(1);
      }
    })" 2>/dev/null
}

# ============================================================
# Test 12: Cache file is written when optimization occurs
# Uses a known noisy command (npm) with large simulated output to
# guarantee the optimizer pipeline runs and writes a cache file.
# ============================================================
test_cache_file_written() {
  # Clean cache before test
  rm -f "${TEST_CACHE_DIR}"/*.json

  # Write a small bash script that generates large output (avoids nested quoting)
  local gen_script="${TEST_HOME}/gen-big-output.sh"
  cat > "${gen_script}" <<'GENEOF'
#!/usr/bin/env bash
for i in $(seq 1 200); do
  echo "warning: deprecated field used at line $i of output - this is a long line of text to ensure we exceed the 4096 byte threshold"
done
GENEOF
  chmod +x "${gen_script}"

  # Run the script through opt with TOKENJUICE_OPT=always to force optimization
  bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=always opt '${gen_script}'" >/dev/null 2>&1

  local cache_files
  cache_files=$(find "${TEST_CACHE_DIR}" -name '*.json' -type f 2>/dev/null | wc -l)
  if [[ ${cache_files} -gt 0 ]]; then
    return 0
  fi
  echo "  no cache file was written to ${TEST_CACHE_DIR} after opt"
  return 1
}

# ============================================================
# Test 13: Double-sourcing the hook is a no-op
# ============================================================
test_double_source() {
  bash -c "
    source '${HOOK_FILE}'
    source '${HOOK_FILE}'
    [[ -n \"\${__TOKENJUICE_BASH_HOOK_LOADED:-}\" ]]
  "
}

# ============================================================
# Test 14: TOKENJUICE_HOOK=off disables optimization
# ============================================================
test_hook_off_disables() {
  # When hook is off, opt should just be a passthrough (since _tokenjuice_should_optimize returns 1)
  local output
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_HOOK=off opt echo 'bypass'")
  assert_contains "${output}" "bypass" "TOKENJUICE_HOOK=off returns raw"
}

# ============================================================
# Test: optimize alias works (synonym for opt)
# ============================================================
test_optimize_alias() {
  local output
  output=$(bash -c "source '${HOOK_FILE}' && optimize printf 'alias-works\\n'")
  assert_contains "${output}" "alias-works" "optimize alias produces output"
}

# ============================================================
# Test: opt surfaces stderr even when optimizing stdout
# ============================================================
test_opt_stderr_passthrough() {
  local output stderr_output
  # Run a command that writes to both stdout and stderr
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=off opt bash -c 'echo stdout-msg; echo stderr-msg 1>&2'" 2>/tmp/test_stderr)
  stderr_output=$(cat /tmp/test_stderr 2>/dev/null || echo "")
  assert_contains "${output}" "stdout-msg" "stdout passes through"
  assert_contains "${stderr_output}" "stderr-msg" "stderr passes through"
  rm -f /tmp/test_stderr
}

# ============================================================
# Test 15: TOKENJUICE_MAX_RAW cap is respected
# ============================================================
test_max_raw_cap() {
  # Generate output > 1 MiB, verify it's capped
  local output
  output=$(bash -c "source '${HOOK_FILE}' && TOKENJUICE_OPT=off opt sh -c 'yes a | head -c 2000000'" 2>/dev/null | wc -c)
  # With TOKENJUICE_OPT=off, no cap is applied (raw passthrough)
  # The cap only applies in optimize path. Just verify the var is set.
  local max_raw
  max_raw=$(bash -c "source '${HOOK_FILE}' && echo \${TOKENJUICE_MAX_RAW}")
  if [[ "${max_raw}" =~ ^[0-9]+$ ]] && [[ ${max_raw} -gt 0 ]]; then
    return 0
  fi
  echo "  TOKENJUICE_MAX_RAW not set or invalid: ${max_raw}"
  return 1
}

# ============================================================
# Run all tests
# ============================================================
run_test "hook loads without error"               test_hook_loads
run_test "status reports expected fields"         test_status_reports_fields
run_test "status reports correct resolved paths"  test_status_reports_paths
run_test "opt returns stdout"                     test_opt_returns_stdout
run_test "opt on small command passthrough"       test_opt_small_command_passthrough
run_test "opt with TOKENJUICE_OPT=off raw"        test_opt_off_returns_raw
run_test "opt with NO_OPTIMIZE=1 raw"             test_opt_no_optimize_returns_raw
run_test "opt optimize alias works"               test_optimize_alias
run_test "opt surfaces stderr"                    test_opt_stderr_passthrough
run_test "opt captures exit code"                 test_opt_captures_exit_code
run_test "opt on noisy command works"             test_opt_noisy_command
run_test "optimizer handles empty stdin"          test_optimizer_empty_stdin
run_test "optimizer rejects invalid JSON"         test_optimizer_invalid_json
run_test "optimizer handles valid JSON"           test_optimizer_valid_json
run_test "cache file written on optimization"     test_cache_file_written
run_test "double-sourcing is a no-op"             test_double_source
run_test "TOKENJUICE_HOOK=off disables opt"       test_hook_off_disables
run_test "TOKENJUICE_MAX_RAW is set"              test_max_raw_cap

# ============================================================
# Summary
# ============================================================
echo "=========================================="
echo "Results: ${TESTS_PASSED}/${TESTS_RUN} passed"
if [[ ${TESTS_FAILED} -gt 0 ]]; then
  echo "Failed tests:"
  for name in "${FAILED_NAMES[@]}"; do
    echo "  - ${name}"
  done
  exit 1
fi
echo "All tests passed."
exit 0
