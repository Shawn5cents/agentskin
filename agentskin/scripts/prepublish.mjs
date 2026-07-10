#!/usr/bin/env node
/**
 * prepublish.mjs — Bundles the full AgentSkin Suite into the npm package.
 *
 * Copies Tokenjuice dist, bash hooks, Caveman skills, MCP wrappers, and
 * agent-optimizer into `suite/` so that `npx agentskin@latest` delivers
 * the complete token optimization stack.
 */

import { mkdir, cp, rm, writeFile, readFile, stat } from 'node:fs/promises';
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
  // Verify Tokenjuice dist exists before starting
  const tjDist = resolve(REPO_ROOT, 'tokenjuice-extracted/tokenjuice-main/dist');
  try {
    await stat(tjDist);
  } catch {
    console.error('Tokenjuice dist not found at:', tjDist);
    console.error('Build it first: cd tokenjuice-extracted/tokenjuice-main && npx tsc');
    process.exit(1);
  }

  // Clear and recreate suite/
  await rm(SUITE, { recursive: true, force: true });
  await mkdir(SUITE, { recursive: true });

  const tasks = [];

  // 1. Copy Tokenjuice dist
  tasks.push(
    cp(tjDist, resolve(SUITE, 'tokenjuice/dist'), { recursive: true })
  );

  // 2. Copy hooks (bash-optimizer.sh + friends)
  const hooksDir = resolve(REPO_ROOT, '.agents/hooks');
  tasks.push(
    cp(hooksDir, resolve(SUITE, 'hooks'), { recursive: true })
  );

  // 3. Copy Caveman skills
  const skillsDir = resolve(REPO_ROOT, '.agents/skills');
  tasks.push(
    cp(skillsDir, resolve(SUITE, 'skills'), { recursive: true })
  );

  // 4. Copy caveman-shrink
  const shrinkDir = resolve(REPO_ROOT, '.agents/mcp/caveman-shrink');
  tasks.push(
    cp(shrinkDir, resolve(SUITE, 'mcp/caveman-shrink'), { recursive: true })
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
    '# AgentSkin MCP launcher (bundled in AgentSkin Suite npm package).',
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

  // tokenjuice-mcp.sh — resolves to ../tokenjuice/dist/hosts/mcp/index.js
  const tokenjuiceWrapper = bashScript([
    '#!/usr/bin/env bash',
    '# Tokenjuice MCP launcher (bundled in AgentSkin Suite npm package).',
    '# Resolves tokenjuice dist relative to this script location.',
    'set -euo pipefail',
    '',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    '# suite/mcp/ -> suite/tokenjuice/dist/hosts/mcp/index.js',
    'TJ_DIR="${TOKENJUICE_DIR:-$(cd "$SCRIPT_DIR/../tokenjuice" 2>/dev/null && pwd || echo "")}"',
    '',
    'if [[ -z "${TJ_DIR}" ]] || [[ ! -f "${TJ_DIR}/dist/hosts/mcp/index.js" ]]; then',
    '  echo "ERROR: Could not find Tokenjuice dist at expected path." >&2',
    '  echo "  Looked for: ${TJ_DIR}/dist/hosts/mcp/index.js" >&2',
    '  echo "  Set TOKENJUICE_DIR env var to override." >&2',
    '  exit 1',
    'fi',
    '',
    'exec node "${TJ_DIR}/dist/hosts/mcp/index.js" "$@"',
  ]);

  await writeFile(resolve(SUITE, 'mcp/agentskin-mcp.sh'), agentskinWrapper, { mode: 0o755 });
  await writeFile(resolve(SUITE, 'mcp/tokenjuice-mcp.sh'), tokenjuiceWrapper, { mode: 0o755 });

  // 7. Generate mcp.json reference config for the bundled package
  // NOTE: These paths assume the project root has agentskin installed in
  // node_modules. Users may need to adjust paths for their setup.
  const mcpConfig = {
    description: 'Reference MCP config for bundled AgentSkin Suite. Paths assume agentskin installed in node_modules. Adjust if using npx or global install.',
    mcpServers: {
      'agentskin-mcp': {
        command: 'bash',
        args: ['./node_modules/agentskin/suite/mcp/agentskin-mcp.sh'],
        env: {},
        description: 'AgentSkin SSS v5.0 — fetch_optimized_data, skin_reasoning, classify_url, strip_ansi',
      },
      'tokenjuice-mcp': {
        command: 'bash',
        args: ['./node_modules/agentskin/suite/mcp/tokenjuice-mcp.sh'],
        env: {},
        description: 'Tokenjuice v0.8.0 — apply_json_semantic, classify_url, strip_ansi, estimate_tokens, reduce',
      },
      'agentskin-shrunk': {
        command: 'node',
        args: ['./node_modules/agentskin/suite/mcp/caveman-shrink/index.js', 'bash', './node_modules/agentskin/suite/mcp/agentskin-mcp.sh'],
        env: {},
        description: '[SHRUNK] AgentSkin v5.0 — same 4 tools with compressed descriptions',
      },
      'tokenjuice-shrunk': {
        command: 'node',
        args: ['./node_modules/agentskin/suite/mcp/caveman-shrink/index.js', 'bash', './node_modules/agentskin/suite/mcp/tokenjuice-mcp.sh'],
        env: {},
        description: '[SHRUNK] Tokenjuice v0.8.0 — same 5 tools with compressed descriptions',
      },
    },
    usage: 'Copy the mcpServers entries you need into your agent MCP config file.',
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

  console.log('✅ AgentSkin Suite bundled into suite/');
  console.log('   - Tokenjuice dist (4.4M)');
  console.log('   - Bash hooks + agent-optimizer');
  console.log('   - Caveman skills (7 skill packs)');
  console.log('   - MCP wrapper scripts + caveman-shrink');
  console.log('   - mcp.json reference config');
}

main().catch((err) => {
  console.error('prepublish failed:', err);
  process.exit(1);
});
