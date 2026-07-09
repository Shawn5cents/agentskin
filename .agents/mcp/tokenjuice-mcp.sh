#!/usr/bin/env bash
# Auto-resolving MCP launcher for Tokenjuice.
# Resolves the tokenjuice-main directory relative to this script's location.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# When .agents/ is at the repo root: .agents/mcp/ -> .agents/ -> repo root
# -> tokenjuice-extracted/tokenjuice-main/
# (When nested deeper in an extracted archive, the auto-resolve may fail; set
# TOKENJUICE_DIR env var to override.)
TJ_DIR="${TOKENJUICE_DIR:-$(cd "$SCRIPT_DIR/../../tokenjuice-extracted/tokenjuice-main" 2>/dev/null && pwd || echo "")}"

if [[ -z "${TJ_DIR}" ]] || [[ ! -f "${TJ_DIR}/dist/hosts/mcp/index.js" ]]; then
  echo "ERROR: Could not find Tokenjuice dist at expected relative path." >&2
  echo "  Looked for: ${SCRIPT_DIR}/../../tokenjuice-extracted/tokenjuice-main/dist/hosts/mcp/index.js" >&2
  echo "  Run 'npx tsc' in tokenjuice-extracted/tokenjuice-main to build dist/" >&2
  echo "  Set TOKENJUICE_DIR env var to override." >&2
  exit 1
fi

exec node "${TJ_DIR}/dist/hosts/mcp/index.js" "$@"
