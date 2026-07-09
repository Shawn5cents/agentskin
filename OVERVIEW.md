# AgentSkin Suite

**A three-component token optimization stack combining the best of:**

| Project | Role | Creator |
|---------|------|---------|
| **AgentSkin** | Semantic JSON pruning via SSS protocol | [Shawn Nichols Sr. — Nichols Transco LLC] |
| **Tokenjuice** | Rule-driven terminal output compaction | [Vincent Koc](https://github.com/vincentkoc/tokenjuice) (MIT License) |
| **Caveman** | Output compression via prompt engineering | [Julius Brussee](https://github.com/JuliusBrussee/caveman) |

## Quick Start

Three commands. Full token optimization stack.

**1. Install the bash hook** — transparent CLI optimization:

```bash
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc
```

**2. Caveman skills** — already active:

`AGENTS.md` in the repo root is auto-discovered by Claude Code, Codex, Cursor, and other agents. No config needed — caveman mode, cavecrew subagents, and caveman-compress are active from message one.

**3. Connect MCP servers** — add to your agent's MCP config:

```json
{
  "mcpServers": {
    "agentskin-mcp": {
      "command": "bash",
      "args": [".agents/mcp/agentskin-mcp.sh"]
    },
    "tokenjuice-mcp": {
      "command": "bash",
      "args": [".agents/mcp/tokenjuice-mcp.sh"]
    }
  }
}
```

For agents that auto-discover `.agents/mcp.json` (Claude Code, Codex, etc.), the servers are detected at startup — no config needed.

**What you get:**
- Transparent bash hook → 99.8% reduction on directory listings, 58.7% on npm output (auto, silent)
- Caveman skills → 73.5% smaller agent replies, 46% smaller memory files
- MCP tools → 88%+ API response pruning with custom signal/alias control
- Combined → 17.1% net token savings per session (zero context overhead from the hook)

**→ Full usage guide:** [USAGE.md](USAGE.md) — copy-paste examples, troubleshooting, and combined workflows for all three optimization paths (bash hook, Caveman skills, MCP servers).

## Why This Combination

AgentSkin excels at stripping semantic noise from **JSON API responses** (88%+ savings on rich APIs). Tokenjuice excels at stripping structural noise from **CLI terminal output** (git, build, lint commands).

**Problem:** Any AI coding agent task cycle calls 5-10 APIs + runs 3-5 CLI commands. Each response fills context with noise:
- API responses: `node_id`, `avatar_url`, `owner` objects, pagination metadata
- CLI output: ANSI colors, timestamps, file paths, dependency trees

**Solution:** Noise goes through AgentSkin (API) + Tokenjuice (CLI) before entering context. Combined recovery: 60-80% of context that was previously wasted.

Both projects expose **MCP servers** (Model Context Protocol), so they integrate with any MCP-aware agent — Claude Code, Cursor, Copilot Chat, Continue, Cline, and others. No vendor lock-in.

## Project Structure

```
agentskin/                         # AgentSkin codebase
├── backend/
│   ├── mcp.js                     # MCP server entry point
│   └── lib/
│       ├── skin-engine.js         # v5.0 — Enhanced with Tokenjuice patterns
│       ├── reasoning-skin.js      # v2.0 — Grapheme-aware
│       ├── text-utils.js          # Ported from Tokenjuice
│       └── api-skin-rules.js      # URL-pattern auto-classification
tokenjuice-extracted/              # Extracted Tokenjuice source
├── src/
│   ├── core/
│   │   ├── json-semantic.ts       # 11 URL rules, prune/flatten/apply
│   │   ├── reduce.ts              # Extended with jsonSemantic dispatch
│   │   ├── classify.ts            # URL match logic + scoring
│   │   ├── compaction-metadata.ts  # Unified CompactionKind types
│   │   ├── text.ts                # ANSI stripping, token estimation
│   │   └── ...
│   ├── hosts/
│   │   └── mcp/index.ts           # MCP server (5 tools)
│   ├── rules/
│   │   ├── tokenjuice-rule.schema.json  # Unified schema
│   │   ├── network/                    # 9 curl/wget/etc. rules
│   │   │   ├── curl-github.json         # +7 new URL-targeted rules
│   │   │   ├── curl-github-search.json
│   │   │   ├── curl-github-pulls.json
│   │   │   ├── curl-npm.json
│   │   │   ├── curl-weather.json
│   │   │   ├── curl-hackernews.json
│   │   │   └── curl-reddit.json
│   │   └── fixtures/network/           # 14 fixtures (7 new)
│   └── ...
```

## Bash Hook — Transparent CLI Optimization

The bash hook intercepts noisy CLI commands and pipes their output through the Tokenjuice reduce pipeline before you see it. Zero agent awareness needed.

### Install

```bash
# One-liner: add to ~/.bashrc and activate now
# (replace with your actual repo path)
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc
source ~/.bashrc
```

Or use the install script:

```bash
bash .agents/hooks/install.sh
```

### What It Does

- Adds a `source` line to `~/.bashrc` that loads the hook on every new shell
- Gives you the `opt` command — prefix any command to optimize its output
- Caches results to `~/.cache/tokenjuice/` for reuse
- Handles the ARG_MAX bug internally (uses temp files, not argv)

### Usage

```bash
# Optimize any command with `opt` prefix
opt curl -s https://api.github.com/repos/expressjs/express
opt npm view express
opt git log --oneline -30
opt ls -laR node_modules/

# Disable for a single command
NO_OPTIMIZE=1 opt curl -s https://api.github.com/repos/expressjs/express
```

### Transparent Alias Mode

By default, only the `opt` prefix triggers optimization. To auto-optimize common commands without the prefix:

```bash
# Enable transparent aliases (curl, git, npm, etc. auto-optimize)
export TOKENJUICE_HOOK_ALIAS=1

# Or add to ~/.bashrc for permanent
```

When enabled, `curl`, `git`, `npm`, `pnpm`, `docker`, `kubectl`, and other noisy commands are automatically intercepted.

### Uninstall

```bash
# Remove from ~/.bashrc and deactivate
bash .agents/hooks/uninstall.sh
```

Or manually:

```bash
# Remove the source line from ~/.bashrc
sed -i '/bash-optimizer.sh/d' ~/.bashrc
source ~/.bashrc
```

### Verification

```bash
tokenjuice-hook-status
```

Shows: optimizer path, mode, min raw threshold, Node.js status, cache location.

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKENJUICE_HOOK` | `on` | `on` or `off` — global toggle |
| `TOKENJUICE_OPT` | `auto` | `always`, `auto`, or `off` — when to optimize |
| `TOKENJUICE_MIN_RAW` | `4096` | Minimum bytes before optimization kicks in |
| `TOKENJUICE_MAX_RAW` | `10485760` | Maximum bytes to capture (10 MB cap) |
| `TOKENJUICE_HOOK_ALIAS` | `0` | `1` to enable transparent aliases |
| `TOKENJUICE_CACHE` | `~/.cache/tokenjuice` | Cache directory for optimized results |
| `NO_OPTIMIZE` | `0` | `1` to skip optimization for a single command |

## Quick Reference

```bash
# Tokenjuice CLI
npx tokenjuice <command>

# Tokenjuice MCP server (integrates with Claude Code, Cursor, Copilot Chat, etc.)
node tokenjuice-extracted/tokenjuice-main/dist/hosts/mcp/index.js

# AgentSkin MCP server
npx agentskin

# Run tests
cd tokenjuice-extracted/tokenjuice-main && npx vitest run   # Tokenjuice
cd ~/Desktop/agentskin && npx vitest run                     # AgentSkin

# Run benchmark
cd ~/Desktop/agentskin && node /tmp/agentskin-benchmark.js
```
