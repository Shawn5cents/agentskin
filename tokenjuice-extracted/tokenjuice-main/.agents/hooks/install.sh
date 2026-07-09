#!/usr/bin/env bash
# .agents/hooks/install.sh
#
# Installs the Tokenjuice bash hook into ~/.bashrc.
# Idempotent: detects existing source line and skips.

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
  echo "Tokenjuice bash hook: already installed in ${BASHRC}"
else
  {
    echo ""
    echo "${MARKER}"
    echo "source \"${HOOK_FILE}\""
  } >> "${BASHRC}"
  echo "Tokenjuice bash hook: installed in ${BASHRC}"
fi

cat <<'EOF'

To activate in the current shell:
  source ~/.bashrc

To verify the hook works:
  tokenjuice-hook-status
  opt pwd
  opt git status

To uninstall:
  .agents/hooks/uninstall.sh
EOF
