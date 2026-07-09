# Usage Guide

**Three paths to token optimization. Pick the ones you need.**

---

## Quick Reference

| Path | What It Saves | How | Overhead |
|------|--------------|-----|----------|
| **Bash Hook** | CLI output (curl, git, npm, ls, builds) | Source a script → prefix with `opt` | Zero — transparent |
| **Caveman Skills** | Agent output (replies, memory files) | AGENTS.md auto-loads on session start | ~1–1.5k input tokens per turn |
| **MCP Servers** | API responses (GitHub, npm, weather, etc.) | Connect to agent config → call as tools | Tool catalog + per-call JSON-RPC framing |

> **Rule of thumb:** Hook for daily terminal work. Caveman for long agent sessions. MCP when you need custom signal/alias control.

---

## Path 1: Bash Hook (Transparent CLI Optimization)

The hook intercepts noisy commands and pipes their output through Tokenjuice before you see it. The agent never knows optimization is happening — zero context overhead.

### Install

```bash
# One-liner: add to ~/.bashrc and activate now
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc
source ~/.bashrc
```

### Verify It Works

```bash
tokenjuice-hook-status
# Output: "Tokenjuice bash hook: loaded" + optimizer path, mode, Node.js status
```

### Everyday Usage

```bash
# Prefix any command with `opt`
opt curl -s https://api.github.com/repos/expressjs/express
opt npm view express
opt git log --oneline -30
opt ls -laR node_modules/

# Skip optimization for one command
NO_OPTIMIZE=1 opt curl -s https://api.github.com/repos/expressjs/express
```

### Transparent Alias Mode (Auto-Optimize)

By default, only `opt` triggers optimization. Enable transparent aliases to auto-optimize common commands without the prefix:

```bash
export TOKENJUICE_HOOK_ALIAS=1   # curl, git, npm, etc. auto-optimize
# Add to ~/.bashrc for permanent
```

> **Caution:** This aliases `curl`, `git`, `npm`, `docker`, `kubectl`, and others globally. Pipes and scripts may behave unexpectedly under alias mode. Start with `opt` first.

### Environment Variables

```bash
TOKENJUICE_HOOK=on            # on | off — global toggle
TOKENJUICE_OPT=auto           # always | auto | off — when to optimize
TOKENJUICE_MIN_RAW=4096       # min bytes before optimization kicks in (default 4KB)
TOKENJUICE_MAX_RAW=10485760   # max bytes to capture (10MB cap)
TOKENJUICE_HOOK_ALIAS=0       # 1 to enable transparent aliases
TOKENJUICE_CACHE=~/.cache/tokenjuice  # cache directory for optimized results
NO_OPTIMIZE=0                 # 1 to skip for a single command
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `tokenjuice-hook-status: command not found` | Run `source .agents/hooks/bash-optimizer.sh` again, or check ~/.bashrc |
| `opt` runs but output looks the same | Payload is under 4KB (`TOKENJUICE_MIN_RAW`). Set `TOKENJUICE_OPT=always` to force |
| `opt: node: command not found` | The hook requires Node.js. Install it or set `TOKENJUICE_HOOK=off` |
| `opt` hangs | Large output + slow reduce pipeline. Increase `TOKENJUICE_MAX_RAW` or skip with `NO_OPTIMIZE=1` |
| ARG_MAX errors with huge output | Fixed internally — the hook uses temp files, not argv. If still failing, check `TOKENJUICE_MAX_RAW` |

### Uninstall

```bash
bash .agents/hooks/uninstall.sh
# Or manually: sed -i '/bash-optimizer.sh/d' ~/.bashrc && source ~/.bashrc
```

---

## Path 2: Caveman Skills (Output Compression)

Caveman compresses what the agent *says* — cutting output tokens by ~65% through prompt engineering. Also compresses memory files permanently.

### Activate

**Already active.** `AGENTS.md` at the repo root auto-loads all 6 Caveman skills for Claude Code, Codex, Cursor, and other agents. No config needed.

### Available Skills

| Skill | What It Does |
|-------|-------------|
| `caveman` (full) | Ultra-compressed output — drops filler, uses fragments, cuts 65% |
| `caveman-commit` | Generates compact Conventional Commits |
| `caveman-review` | One-line code review comments: location, problem, fix |
| `caveman-stats` | Shows real token usage and savings for the session |
| `caveman-compress` | Rewrites memory files (CLAUDE.md, etc.) to caveman-speak — 46% smaller permanently |
| `cavecrew` | Delegates to compressed subagents (investigator, builder, reviewer) — 60% smaller subagent output |

### Usage in Agent Sessions

```text
# After caveman is active, just talk normally — output comes back compressed:

User: "debug the auth timeout"
Agent: "tok: ok. check session.ts:42 — ttl default 5s. bump to 30s or make env var."
```

### Compress Project Docs (One-Time)

```text
/caveman-compress OVERVIEW.md
/caveman-compress ARCHITECTURE.md
/caveman-compress STATUS.md
```

Each file shrinks ~46%. Every agent that reads them after saves input tokens forever.

### Cavecrew Subagents

```text
# Delegate investigation to compressed subagent (60% smaller output)
"Use cavecrew-investigator to find where auth middleware is defined"

# Surgical edits
"Use cavecrew-builder to add rate limiting to login.ts"

# Diff review
"Use cavecrew-reviewer to check the last commit"
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Agent replies are still verbose | Verify `AGENTS.md` is in the repo root and contains `@.agents/skills/caveman/SKILL.md`. Some agents require explicit `/caveman` |
| `/caveman-stats` shows nothing | Requires Claude Code hooks (see caveman repo for full hook install). Works out of the box on Codex |
| Caveman overhead exceeds savings | On short replies (< 1.5–2k output tokens), caveman costs more than it saves. Remove `@.agents/skills/caveman/SKILL.md` from `AGENTS.md` for quick-task sessions |
| Cavecrew subagent doesn't spawn | The `cavecrew` skill must be loaded. Check `.agents/agents/` contains `cavecrew-investigator.md`, `cavecrew-builder.md`, `cavecrew-reviewer.md` |

---

## Path 3: MCP Servers (Precision API Optimization)

MCP tools let the agent call AgentSkin and Tokenjuice directly — giving it control over signals, aliases, and pruning strategy.

### Connect

Add to your agent's MCP config (`claude_desktop_config.json`, `.codex/config.json`, etc.):

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

> **Auto-discovery:** Agents that support `.agents/mcp.json` (Claude Code, Codex) detect servers at startup — no config needed.

### Available Tools

**AgentSkin (4 tools):**

| Tool | What It Does |
|------|-------------|
| `fetch_optimized_data(url, signals?, aliases?)` | Fetches API URL, prunes JSON, returns compact Markdown skin. Auto-classifies GitHub, npm, weather, HackerNews, Reddit, etc. Params passed as JSON: `{"url": "...", "signals": ["name"], "aliases": {"stargazers_count": "stars"}}` |
| `skin_reasoning(text)` | Strips hedge words, filler, redundant qualifiers from LLM-to-LLM text (14–29% savings) |
| `classify_url(url)` | Returns the URL rule family and score (for debugging) |
| `strip_ansi(text)` | Strips 5 patterns of ANSI escape codes |

**Tokenjuice (5 tools):**

| Tool | What It Does |
|------|-------------|
| `apply_json_semantic(json, url?)` | AgentSkin-style JSON pruning — extracts signal keys, applies URL rules. Pass `{"json": {...}, "url": "https://..."}` |
| `classify_url(url)` | URL extraction + rule scoring |
| `strip_ansi(text)` | 5-pattern ANSI stripping |
| `estimate_tokens(text)` | Grapheme-accurate token estimation (Intl.Segmenter) |
| `reduce(command, output)` | Full reduction pipeline on CLI command output |

### Caveman-Shrunk Variants

For when tool catalog size matters — same tools, compressed descriptions:

```json
{
  "mcpServers": {
    "agentskin-shrunk": {
      "command": "node",
      "args": [".agents/mcp/caveman-shrink/index.js", "bash", ".agents/mcp/agentskin-mcp.sh"]
    },
    "tokenjuice-shrunk": {
      "command": "node",
      "args": [".agents/mcp/caveman-shrink/index.js", "bash", ".agents/mcp/tokenjuice-mcp.sh"]
    }
  }
}
```

### When to Use MCP vs the Hook

| Scenario | Use |
|----------|-----|
| Agent curls an API, wants results in context | **Hook** (transparent, zero overhead) |
| Agent needs specific signals: "give me only stars and language" | **MCP** — `fetch_optimized_data(url, signals=["stars", "language"])` |
| Agent wants alias remapping: "rename stargazers_count → stars" | **MCP** — `fetch_optimized_data(url, aliases={"stargazers_count":"stars"})` |
| Data arrives NOT via CLI (JSON embedded in context) | **MCP** — `apply_json_semantic(json)` |
| LLM-to-LLM text noise (review comments, explanations) | **MCP** — `skin_reasoning(text)` |
| Every other case | **Hook** — zero overhead is always better |

> **The MCP paradox:** MCP tools spend 2,061 tokens per session (tool catalog + per-call framing) before saving anything. The hook saves 17.1% net because it has zero overhead. Use MCP when the hook's automatic classification isn't enough — not as the primary path.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP server not connecting | Check `node` is installed. Run `cd agentskin && npm install`. Verify wrapper scripts exist at `.agents/mcp/*.sh` |
| `fetch_optimized_data` returns raw JSON | URL isn't recognized. Check `classify_url(url)` — if no rule matches, the raw data is returned |
| Negative savings (skin larger than raw) | Small payloads (< 500 bytes) can grow from Markdown conversion overhead. The safety valve catches most cases via the fee model, but payloads ~225 tokens may slip through (known edge case — see BENCHMARK.md). Consider skipping MCP for tiny responses. |
| Rate limiting | 30 req/min for AgentSkin, 60 req/min for Tokenjuice. Wait 60s or spread calls |
| Tool not appearing in agent | Restart the agent session after changing MCP config |

---

## Combined: Full Stack Setup

All three paths, working together:

```bash
# 1. Bash hook (transparent CLI optimization)
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc

# 2. Caveman skills (output compression) — already active via AGENTS.md
# Verify: cat AGENTS.md | head -5

# 3. MCP servers (API precision) — add to agent config or rely on .agents/mcp.json auto-discovery
# Restart your agent session

# Verify all three:
tokenjuice-hook-status          # Path 1: hook loaded?
ls .agents/skills/caveman/      # Path 2: skills present?
ls .agents/mcp/*.sh             # Path 3: MCP wrappers present?
```

### Expected Savings (Per Session)

| Layer | Savings | Mechanism |
|-------|---------|-----------|
| Bash Hook | 17.1% net (up to 99.8% on large outputs) | Transparent CLI compaction |
| Caveman | 73.5% of output tokens | Compressed agent replies |
| MCP (optional) | 42–88% per API call (minus ~2k overhead) | Precision JSON pruning |

### When to Disable Each Path

| Path | Disable With |
|------|-------------|
| Bash Hook | `TOKENJUICE_HOOK=off` or `NO_OPTIMIZE=1` per command |
| Caveman | Remove `@.agents/skills/caveman/SKILL.md` from `AGENTS.md` (Caveman has intensity levels, not an off toggle) |
| MCP | Remove from agent's MCP config |
| All three | `TOKENJUICE_HOOK=off` + remove caveman from AGENTS.md + remove MCP config |
