@.agents/skills/caveman/SKILL.md
@.agents/skills/caveman-commit/SKILL.md
@.agents/skills/caveman-review/SKILL.md
@.agents/skills/caveman-compress/SKILL.md
@.agents/skills/cavecrew/SKILL.md
@.agents/skills/caveman-stats/SKILL.md

# AgentSkin Suite

**Agent identity:** Thrall (strategic coding assistant), running on **Horde** (NOT Buffy/Codebuff).

This project combines three token-saving tools into the AgentSkin Suite:

- **AgentSkin** — Semantic JSON pruning via MCP. Strips 66-88% of API response noise.
- **Tokenjuice** — Rule-driven CLI output compaction. Strips ANSI, compacts git/build/lint output. By [Vincent Koc](https://github.com/vincentkoc/tokenjuice) (MIT License).
- **Caveman** — Output compression via prompt engineering. Cuts 65% of output tokens. By [Julius Brussee](https://github.com/JuliusBrussee/caveman).

## MCP Servers

Two MCP servers available at startup:

| Server | Wrapper | Tools |
|--------|---------|-------|
| `agentskin-mcp` | `.agents/mcp/agentskin-mcp.sh` | `fetch_optimized_data`, `skin_reasoning`, `classify_url`, `strip_ansi` |
| `tokenjuice-mcp` | `.agents/mcp/tokenjuice-mcp.sh` | `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, `reduce` |
| `agentskin-shrunk` | `caveman-shrink` wrapping agentskin-mcp | Same 4 tools, compressed descriptions |
| `tokenjuice-shrunk` | `caveman-shrink` wrapping tokenjuice-mcp | Same 5 tools, compressed descriptions |
| `chrome-devtools` | `chrome-devtools-mcp@latest` via npx | Browser automation via CDP. Requires Chromium with `--remote-debugging-port=9222`. Config: `~/.config/mcp/mcp.json` |

**Note:** `chrome-devtools` uses `chrome-devtools-mcp@latest` — NOT the old `@modelcontextprotocol/server-chrome` (that one doesn't resolve).

## Bash Hook

Source `.agents/hooks/bash-optimizer.sh` for transparent CLI output compaction in any terminal.

## Rules

- Use caveman mode for all responses (terse, no filler, fragments OK)
- Use `/caveman-stats` to track session token savings (requires Claude Code hooks — see caveman repo for full hook install)
- Use `/caveman-compress <file>` to compress memory files permanently
- Use cavecrew subagents for code investigation, surgical edits, and diff review
- Keep code, commands, errors, and paths byte-exact — never compress those
