#!/usr/bin/env node
/**
 * prepublish.mjs — Prepares AgentSkin runtime helpers for the npm package.
 *
 * Tokenjuice is a normal npm dependency. This step only bundles the optional
 * shell hook, agent optimizer, and MCP wrapper used by the package.
 */

import { mkdir, cp, rm, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(__dirname, '../..');
const SUITE = resolve(ROOT, 'suite');

// Helper: build a bash script from lines (avoids template literal ${} issues)
function bashScript(lines) {
  return lines.join('\n') + '\n';
}

async function main() {
  // Clear and recreate suite/
  await rm(SUITE, { recursive: true, force: true });
  await mkdir(SUITE, { recursive: true });

  const tasks = [];

  // 2. Copy hooks (bash-optimizer.sh + friends)
  const hooksDir = resolve(REPO_ROOT, '.agents/hooks');
  tasks.push(
    cp(hooksDir, resolve(SUITE, 'hooks'), { recursive: true })
  );

  // 5. Copy agent-optimizer.mjs
  const optimizer = resolve(REPO_ROOT, 'scripts/agent-optimizer.mjs');
  tasks.push(
    cp(optimizer, resolve(SUITE, 'agent-optimizer.mjs'))
  );

  await Promise.all(tasks);

  // 6. Generate MCP wrapper scripts with correct paths for npm package
  await mkdir(resolve(SUITE, 'mcp'), { recursive: true });

  // agentskin-mcp.sh — resolves to ../../backend/mcp.js (package root)
  const agentskinWrapper = bashScript([
    '#!/usr/bin/env bash',
    '# AgentSkin MCP launcher (8 tools, bundled in npm package).',
    '# Resolves backend/mcp.js relative to this script location.',
    'set -euo pipefail',
    '',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    '# suite/mcp/ -> suite/ -> agentskin/ (package root)',
    'AGENTSKIN_DIR="${AGENTSKIN_DIR:-$(cd "$SCRIPT_DIR/../.." 2>/dev/null && pwd || echo "")}"',
    '',
    'if [[ -z "${AGENTSKIN_DIR}" ]] || [[ ! -f "${AGENTSKIN_DIR}/backend/mcp.js" ]]; then',
    '  echo "ERROR: Could not find AgentSkin backend at expected path." >&2',
    '  echo "  Looked for: ${AGENTSKIN_DIR}/backend/mcp.js" >&2',
    '  echo "  Set AGENTSKIN_DIR env var to override." >&2',
    '  exit 1',
    'fi',
    '',
    'exec node "${AGENTSKIN_DIR}/backend/mcp.js" "$@"',
  ]);

  await writeFile(resolve(SUITE, 'mcp/agentskin-mcp.sh'), agentskinWrapper, { mode: 0o755 });

  // 7. Generate mcp.json reference config for the bundled package
  const mcpConfig = {
    description: 'AgentSkin context middleware — 3 primary workflows plus compatibility tools.',
    mcpServers: {
      'agentskin': {
        command: 'npx',
        args: ['-y', 'agentskin@latest'],
        env: {},
        description: 'AgentSkin v5.1.0 — primary: compress, fetch_optimized_data, reduce; compatibility tools retained',
      },
    },
  };

  await writeFile(
    resolve(SUITE, 'mcp.json'),
    JSON.stringify(mcpConfig, null, 2) + '\n',
  );

  // 8. Rewrite the bundled bash-optimizer.sh to use suite/ paths
  const hookPath = resolve(SUITE, 'hooks/bash-optimizer.sh');
  let hookContent = await readFile(hookPath, 'utf8');

  // Replace the two-level parent path resolution comment
  hookContent = hookContent.replace(
    '# Go up two levels from .agents/hooks/ to reach repo root',
    '# Bundled: hooks/ lives in suite/ alongside agent-optimizer.mjs',
  );

  // Replace the multi-line path resolution: /../.. -> /..
  hookContent = hookContent.replace(
    '_TOKENJUICE_REPO_ROOT="$(cd "${_TOKENJUICE_HOOK_DIR}/../.." 2>/dev/null && pwd || echo "")"',
    '_TOKENJUICE_REPO_ROOT="$(cd "${_TOKENJUICE_HOOK_DIR}/.." 2>/dev/null && pwd || echo "")"',
  );

  // Replace the fallback: strip two components -> strip one
  hookContent = hookContent.replace(
    '_TOKENJUICE_REPO_ROOT="${_TOKENJUICE_HOOK_DIR%/*/*}"',
    '_TOKENJUICE_REPO_ROOT="${_TOKENJUICE_HOOK_DIR%/*}"',
  );

  // Replace the bin path: scripts/agent-optimizer.mjs -> agent-optimizer.mjs
  hookContent = hookContent.replace(
    ': "${TOKENJUICE_BIN:="${_TOKENJUICE_REPO_ROOT}/scripts/agent-optimizer.mjs"}"',
    ': "${TOKENJUICE_BIN:="${_TOKENJUICE_REPO_ROOT}/agent-optimizer.mjs"}"',
  );

  await writeFile(hookPath, hookContent, { mode: 0o644 });

  console.log('AgentSkin runtime helpers bundled into suite/');
  console.log('   - Tokenjuice runtime provided by npm dependency');
  console.log('   - Bash hooks + agent-optimizer');
  console.log('   - MCP wrapper script');
  console.log('   - mcp.json reference config');
}

main().catch((err) => {
  console.error('prepublish failed:', err);
  process.exit(1);
});
