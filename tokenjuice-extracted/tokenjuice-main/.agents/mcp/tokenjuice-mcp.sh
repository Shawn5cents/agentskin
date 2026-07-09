#!/usr/bin/env bash
# Auto-resolving MCP launcher for Tokenjuice.
# Resolves the tokenjuice-main directory relative to this script's location.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .agents/mcp/ -> .agents/ -> tokenjuice-main/
TJ_DIR="${TOKENJUICE_DIR:-$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd || echo "")}"

if [[ -z "${TJ_DIR}" ]] || [[ ! -f "${TJ_DIR}/dist/hosts/mcp/index.js" ]]; then
  echo "ERROR: Could not find Tokenjuice dist at expected relative path." >&2
  echo "  Looked for: ${SCRIPT_DIR}/../../dist/hosts/mcp/index.js" >&2
  echo "  Run 'npx tsc' in tokenjuice-main to build dist/" >&2
  echo "  Set TOKENJUICE_DIR env var to override." >&2
  exit 1
fi

exec node "${TJ_DIR}/dist/hosts/mcp/index.js" "$@"
