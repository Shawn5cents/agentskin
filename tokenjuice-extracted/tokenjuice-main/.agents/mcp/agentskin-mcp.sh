#!/usr/bin/env bash
# Auto-resolving MCP launcher for AgentSkin.
# Resolves the agentskin directory relative to this script's location.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .agents/mcp/ -> .agents/ -> tokenjuice-main/ -> tokenjuice-extracted/ -> repo root -> agentskin/
AGENTSKIN_DIR="${AGENTSKIN_DIR:-$(cd "$SCRIPT_DIR/../../../../agentskin" 2>/dev/null && pwd || echo "")}"

if [[ -z "${AGENTSKIN_DIR}" ]] || [[ ! -f "${AGENTSKIN_DIR}/backend/mcp.js" ]]; then
  echo "ERROR: Could not find agentskin at expected relative path." >&2
  echo "  Looked for: ${SCRIPT_DIR}/../../../../agentskin/backend/mcp.js" >&2
  echo "  Set AGENTSKIN_DIR env var to override." >&2
  exit 1
fi

exec node "${AGENTSKIN_DIR}/backend/mcp.js" "$@"
