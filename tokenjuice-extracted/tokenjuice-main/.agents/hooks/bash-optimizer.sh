#!/usr/bin/env bash
# .agents/hooks/bash-optimizer.sh
#
# Transparent bash hook: intercepts "noisy" CLI commands and pipes their
# output through Tokenjuice's reduce pipeline before printing to the user.
#
# What it does:
#   - Captures stdout/stderr/exit code from a command
#   - Sends them to `node agent-optimizer.mjs` as a JSON ToolExecutionInput
#   - Replaces the inline text with the optimized compact form
#   - Saves full output to ~/.cache/tokenjuice/<id>.json for later retrieval
#
# Setup:
#   source /path/to/tokenjuice/.agents/hooks/bash-optimizer.sh
#   # or
#   echo 'source /path/to/tokenjuice/.agents/hooks/bash-optimizer.sh' >> ~/.bashrc
#
# Disable per-command:
#   NO_OPTIMIZE=1 git status
#
# Disable globally:
#   TOKENJUICE_HOOK=off
#
# Environment variables:
#   TOKENJUICE_HOOK     on|off            (default: on when sourced)
#   TOKENJUICE_OPT      always|auto|off   (default: auto; optimize only if raw > 4KB)
#   TOKENJUICE_CACHE    dir               (default: ~/.cache/tokenjuice)
#   TOKENJUICE_BIN      path              (default: auto-detected, this directory)
#   TOKENJUICE_MIN_RAW  bytes             (default: 4096)
#   TOKENJUICE_TOOL     tool name         (default: "Bash")

# Guard against double-sourcing
if [[ -n "${__TOKENJUICE_BASH_HOOK_LOADED:-}" ]]; then
  return 0 2>/dev/null || true
fi
__TOKENJUICE_BASH_HOOK_LOADED=1

# Resolve paths
# _TOKENJUICE_HOOK_DIR = this file's directory (.agents/hooks/)
# _TOKENJUICE_REPO_ROOT = repo root (one level up from .agents/)
# TOKENJUICE_BIN defaults to ${REPO_ROOT}/scripts/agent-optimizer.mjs
_TOKENJUICE_HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
if [[ -z "${_TOKENJUICE_HOOK_DIR}" ]]; then
  _TOKENJUICE_HOOK_DIR="$(pwd)"
fi
# Go up two levels from .agents/hooks/ to reach repo root
_TOKENJUICE_REPO_ROOT="$(cd "${_TOKENJUICE_HOOK_DIR}/../.." 2>/dev/null && pwd || echo "")"
if [[ -z "${_TOKENJUICE_REPO_ROOT}" ]]; then
  # Fallback: strip two trailing components (.agents/hooks → repo root).
  # If we can't resolve, leave empty so the downstream existence check catches it.
  _TOKENJUICE_REPO_ROOT="${_TOKENJUICE_HOOK_DIR%/*/*}"
fi
: "${TOKENJUICE_BIN:="${_TOKENJUICE_REPO_ROOT}/scripts/agent-optimizer.mjs"}"
: "${TOKENJUICE_CACHE:="${HOME}/.cache/tokenjuice"}"
: "${TOKENJUICE_OPT:=auto}"
: "${TOKENJUICE_MIN_RAW:=4096}"
: "${TOKENJUICE_TOOL:=Bash}"
: "${TOKENJUICE_MAX_RAW:=10485760}"  # 10 MiB cap on raw capture
mkdir -p "${TOKENJUICE_CACHE}" 2>/dev/null || true

# Cross-platform millisecond timestamp (Linux %N, macOS perl fallback)
_tokenjuice_ms() {
  local ts
  ts=$(date +%s%3N 2>/dev/null || true)
  if [[ "${ts}" == *%* ]] || [[ -z "${ts}" ]]; then
    if command -v perl >/dev/null 2>&1; then
      perl -MTime::HiRes -e 'print int(Time::HiRes::time()*1000)'
    else
      echo $(( $(date +%s) * 1000 ))
    fi
  else
    echo "${ts}"
  fi
}

# Check node availability up front
if ! command -v node >/dev/null 2>&1; then
  __TOKENJUICE_BASH_HOOK_NODE_OK=0
else
  __TOKENJUICE_BASH_HOOK_NODE_OK=1
fi

# Commands that benefit from optimization
_TOKENJUICE_NOISY_REGEX='^(npm|pnpm|yarn|bun|git|docker|kubectl|terraform|cargo|go|pytest|jest|vitest|curl|httpie|http|gh|ls|pip|pip3|brew|apt|make|cmake|gradle|mvn|node|deno|ruby|rails|psql|redis-cli|jq|aws|gcloud|heroku|netlify|vercel|firebase|supabase|node)$'

_tokenjuice_should_optimize() {
  local cmd="$1"
  local raw_size="$2"

  if [[ "${TOKENJUICE_HOOK:-on}" == "off" ]]; then
    return 1
  fi
  if [[ "${NO_OPTIMIZE:-0}" == "1" ]]; then
    return 1
  fi
  if [[ "${__TOKENJUICE_BASH_HOOK_NODE_OK}" != "1" ]]; then
    return 1
  fi
  if [[ ! -f "${TOKENJUICE_BIN}" ]]; then
    return 1
  fi

  case "${TOKENJUICE_OPT}" in
    off) return 1 ;;
    always) return 0 ;;
    auto|*)
      # Optimize if raw output is large OR command is a known noisy CLI
      if (( raw_size >= TOKENJUICE_MIN_RAW )); then
        return 0
      fi
      if [[ "${cmd}" =~ ${_TOKENJUICE_NOISY_REGEX} ]]; then
        return 0
      fi
      return 1
      ;;
  esac
}

# Internal: run command, capture, optimize, print
# Args: command-args...
_tokenjuice_run_optimized() {
  local start_ms end_ms duration_ms
  local tmp_out tmp_err
  local exit_code
  local raw_size

  tmp_out="$(mktemp)"
  tmp_err="$(mktemp)"
  trap 'rm -f "${tmp_out}" "${tmp_err}"' RETURN

  start_ms=$(_tokenjuice_ms)
  # shellcheck disable=SC2068
  "$@" >"${tmp_out}" 2>"${tmp_err}"
  exit_code=$?
  end_ms=$(_tokenjuice_ms)
  duration_ms=$(( end_ms - start_ms ))

  local cmd_str
  cmd_str="$*"
  local cmd0="${1:-}"
  local argv_json
  argv_json=$(printf '%s\n' "$@" | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      const a=d.split("\n").filter(Boolean);
      process.stdout.write(JSON.stringify(a));
    })' 2>/dev/null || echo '[]')

  local stdout_str stderr_str
  stdout_str=$(cat "${tmp_out}")
  stderr_str=$(cat "${tmp_err}")

  # Cap raw capture size to avoid OOM on huge outputs
  if (( ${#stdout_str} > TOKENJUICE_MAX_RAW )); then
    stdout_str="${stdout_str:0:TOKENJUICE_MAX_RAW}
... [truncated ${#stdout_str} bytes -> ${TOKENJUICE_MAX_RAW}] ..."
  fi
  raw_size=${#stdout_str}

  # If we shouldn't optimize, just print as-is
  if ! _tokenjuice_should_optimize "${cmd0}" "${raw_size}"; then
    if [[ -n "${stdout_str}" ]]; then
      printf '%s\n' "${stdout_str}"
    fi
    if [[ -n "${stderr_str}" ]]; then
      printf '%s' "${stderr_str}" >&2
    fi
    return ${exit_code}
  fi

  # Build JSON input for the optimizer
  local payload
  payload=$(node -e '
    const args = JSON.parse(process.argv[1] || "[]");
    const out = process.argv[2] || "";
    const err = process.argv[3] || "";
    const code = parseInt(process.argv[4] || "0", 10);
    const dur = parseInt(process.argv[5] || "0", 10);
    const tool = process.argv[6] || "Bash";
    const cwd = process.argv[7] || process.cwd();
    const input = {
      toolName: tool,
      command: args.join(" "),
      argv: args,
      stdout: out,
      stderr: err,
      exitCode: code,
      durationMs: dur,
      cwd,
    };
    process.stdout.write(JSON.stringify(input));
  ' "${argv_json}" "${stdout_str}" "${stderr_str}" "${exit_code}" "${duration_ms}" "${TOKENJUICE_TOOL}" "${PWD}" 2>/dev/null)

  # Pipe through the optimizer
  local optimized
  local opt_exit
  optimized=$(printf '%s' "${payload}" | node "${TOKENJUICE_BIN}" 2>/dev/null)
  opt_exit=$?

  if (( opt_exit != 0 )) || [[ -z "${optimized}" ]]; then
    # Optimizer failed — fall back to raw output
    if [[ -n "${stdout_str}" ]]; then
      printf '%s\n' "${stdout_str}"
    fi
    if [[ -n "${stderr_str}" ]]; then
      printf '%s' "${stderr_str}" >&2
    fi
    return ${exit_code}
  fi

  # Save the full compact result for retrieval.
  # Sanitize cmd0 for filesystem use: replace any non-alphanumeric chars
  # (slashes, dots, dashes) with underscores so the cache_id is a single
  # filename component rather than a nested path.
  local cmd_safe cache_id
  cmd_safe=$(printf '%s' "${cmd0}" | tr -c '[:alnum:]' '_')
  cache_id=$(printf '%s_%s_%s' "${cmd_safe}" "$(date +%s)" "$$")
  printf '%s' "${optimized}" > "${TOKENJUICE_CACHE}/${cache_id}.json" 2>/dev/null || true

  # Extract inlineText and print to user
  local inline
  inline=$(printf '%s' "${optimized}" | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
      try {
        const r = JSON.parse(d);
        process.stdout.write(r.inlineText || r.previewText || "");
      } catch (e) {
        process.stdout.write("");
      }
    })' 2>/dev/null)

  if [[ -n "${inline}" ]]; then
    printf '%s\n' "${inline}"
  fi

  # Surface stderr always (we don't optimize stderr by default)
  if [[ -n "${stderr_str}" ]]; then
    printf '%s' "${stderr_str}" >&2
  fi

  return ${exit_code}
}

# Define `opt` and `optimize` as user-facing commands
opt() { _tokenjuice_run_optimized "$@"; }
optimize() { _tokenjuice_run_optimized "$@"; }

# Aliases for the most common noisy commands.
# DEFAULT OFF: transparent aliasing of `git`, `npm`, etc. surprises users in
# pipes and scripts. Set TOKENJUICE_HOOK_ALIAS=1 to opt in.
# shellcheck disable=SC2139
if [[ "${TOKENJUICE_HOOK_ALIAS:-0}" == "1" ]]; then
  alias git='_tokenjuice_run_optimized git'
  alias npm='_tokenjuice_run_optimized npm'
  alias pnpm='_tokenjuice_run_optimized pnpm'
  alias yarn='_tokenjuice_run_optimized yarn'
  alias docker='_tokenjuice_run_optimized docker'
  alias kubectl='_tokenjuice_run_optimized kubectl'
  alias curl='_tokenjuice_run_optimized curl'
  alias gh='_tokenjuice_run_optimized gh'
fi

# Status command
tokenjuice-hook-status() {
  cat <<EOF
Tokenjuice bash hook: loaded
  optimizer: ${TOKENJUICE_BIN}
  cache:     ${TOKENJUICE_CACHE}
  mode:      ${TOKENJUICE_OPT}
  min raw:   ${TOKENJUICE_MIN_RAW} bytes
  tool:      ${TOKENJUICE_TOOL}
  node:      $([[ ${__TOKENJUICE_BASH_HOOK_NODE_OK} == 1 ]] && echo "ok" || echo "MISSING")
  toggle:    TOKENJUICE_HOOK=on|off  NO_OPTIMIZE=1 <cmd>
  aliases:   TOKENJUICE_HOOK_ALIAS=0 (off, default) | 1 (on)
  cap:       TOKENJUICE_MAX_RAW=${TOKENJUICE_MAX_RAW} bytes
EOF
}
