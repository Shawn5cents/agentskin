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

## MCP Server

One unified MCP server with 7 tools:

| Server | Wrapper | Tools |
|--------|---------|-------|
| `agentskin-suite` | `npx agentskin@latest` | `fetch_optimized_data`, `skin_reasoning`, `classify_url`, `strip_ansi`, `reduce`, `estimate_tokens`, `apply_json_semantic` |

## Bash Hook

Source `.agents/hooks/bash-optimizer.sh` for transparent CLI output compaction in any terminal.

## Rules

- Use caveman mode for all responses (terse, no filler, fragments OK)
- Use `/caveman-stats` to track session token savings (requires Claude Code hooks — see caveman repo for full hook install)
- Use `/caveman-compress <file>` to compress memory files permanently
- Use cavecrew subagents for code investigation, surgical edits, and diff review
- Keep code, commands, errors, and paths byte-exact — never compress those
