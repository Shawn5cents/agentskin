#!/usr/bin/env bash
# .agents/hooks/uninstall.sh
#
# Removes the Tokenjuice bash hook source line from ~/.bashrc.

set -euo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
HOOK_FILE="${HOOK_DIR}/bash-optimizer.sh"

if [[ ! -f "${HOOK_FILE}" ]]; then
  echo "ERROR: hook file not found at ${HOOK_FILE}" >&2
  exit 1
fi

MARKER="# Tokenjuice bash hook (auto-injected by .agents/hooks/install.sh)"
BASHRC="${HOME}/.bashrc"

if [[ -f "${BASHRC}" ]] && grep -qFx "${MARKER}" "${BASHRC}"; then
  # Store all lines, then remove the block (optional blank + marker + source line)
  tmp="$(mktemp)"
  awk '
    { lines[NR] = $0 }
    END {
      for (i = 1; i <= NR; i++) {
        if (lines[i] ~ /# Tokenjuice bash hook/) {
          if (i > 1 && lines[i-1] ~ /^[[:space:]]*$/) delete lines[i-1]
          delete lines[i]
          if (i + 1 <= NR) { delete lines[i + 1]; i++ }
        }
      }
      for (i = 1; i <= NR; i++) {
        if (i in lines) print lines[i]
      }
    }
  ' "${BASHRC}" > "${tmp}"
  mv "${tmp}" "${BASHRC}"
  echo "Tokenjuice bash hook: removed from ${BASHRC}"
else
  echo "Tokenjuice bash hook: not present in ${BASHRC}"
fi
