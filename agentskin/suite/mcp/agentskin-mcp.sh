#!/usr/bin/env bash
# AgentSkin MCP launcher (bundled in AgentSkin Suite npm package).
# Resolves backend/mcp.js relative to this script location.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# suite/mcp/ -> suite/ -> agentskin/ (package root)
AGENTSKIN_DIR="${AGENTSKIN_DIR:-$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd || echo "")}"

if [[ -z "${AGENTSKIN_DIR}" ]] || [[ ! -f "${AGENTSKIN_DIR}/backend/mcp.js" ]]; then
  echo "ERROR: Could not find AgentSkin backend at expected path." >&2
  echo "  Looked for: ${AGENTSKIN_DIR}/backend/mcp.js" >&2
  echo "  Set AGENTSKIN_DIR env var to override." >&2
  exit 1
fi

exec node "${AGENTSKIN_DIR}/backend/mcp.js" "$@"
