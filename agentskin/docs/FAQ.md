# AgentSkin Suite FAQ (Backed by Benchmarks)

## General

### What is the AgentSkin Suite?
Three complementary tools that eliminate token waste across the full AI agent cycle:
- **AgentSkin SSS** — Semantic JSON pruning for API responses (60–88% savings)
- **Tokenjuice CLI** — Rule-driven terminal output compaction (up to 99.97%)
- **Caveman** — Output compression via prompt engineering (65% output reduction)

### Who created each component?
- **AgentSkin SSS:** Shawn Nichols Sr. (Nichols Transco LLC)
- **Tokenjuice:** Vincent Koc ([MIT License](https://github.com/vincentkoc/tokenjuice))
- **Caveman:** Julius Brussee ([github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman))

### How do I know this won't delete important data?

SSS uses explicit whitelist (signals). Deterministic code guarantees completeness for requested keys. Tests verify. The safety valve rejects any skin that would be larger than the raw input.

### Modern LLMs have 2M+ context. Why prune?

Perceptual drag: attention wasted on noise. Benchmarks: GitHub API 1,544 → 180 GPT-4 tokens (88.3% savings). Reasoning accuracy improves as model focuses on signals. More context = more useful work per session.

## AgentSkin SSS

### What are the token savings?

**Benchmarked (GPT-4 cl100k_base):**
- GitHub API: **88.3%** (1,544 → 180 tokens)
- Weather API: **66.3%** token savings
- JSONPlaceholder: **4-9%** (already compact)
- Savings vary by data structure complexity and signal specificity

### Why local server?

Self-sovereign: data never leaves host. Zero-latency pruning.

Run `npm run benchmark` for local reproduction.

### What APIs are auto-classified?

11 built-in URL rule families: GitHub (repos/users/issues/pulls/search), npm, weather (Open-Meteo), HackerNews, Reddit, JSONPlaceholder (posts/users). You can add custom rules via the 3-layer config (builtin → user → project).

## Tokenjuice

### What is Tokenjuice?

A rule-driven terminal output compactor by Vincent Koc. It strips ANSI codes, compacts dependency trees, truncates repeated patterns, and preserves head/tail of large outputs. 136 rules, 143 fixtures.

### What are the savings?

- `ls -laR` directory listings: **99.97%** (3.19M → 897 chars)
- `npm view express`: **58.7%**
- Typical CLI output: **3-60%** depending on command

### What is the bash hook?

Source `.agents/hooks/bash-optimizer.sh` and prefix any command with `opt`. The hook transparently pipes output through Tokenjuice before the agent sees it. Zero overhead, zero agent awareness.

### How is Tokenjuice different from AgentSkin?

AgentSkin prunes **JSON API responses** semantically (keeps signal keys, drops noise). Tokenjuice compacts **CLI terminal output** structurally (strips ANSI, truncates patterns, preserves head/tail). They complement each other — use both for full coverage.

## Caveman

### What is Caveman?

A prompt-engineering skill by Julius Brussee that makes agents talk like cavemen. Same answers, 65% fewer output tokens. Brain still big. Mouth small.

### What are the savings?

- Agent replies: **65% average** output token reduction
- Memory files (caveman-compress): **46% smaller** permanently
- Range: 22–87% depending on prompt complexity

### Does Caveman lose technical accuracy?

No. Code, commands, errors, and paths are byte-for-byte exact. Only the surrounding prose is compressed.

### What agents does Caveman support?

Claude Code, Codex, Gemini, Cursor, Windsurf, Cline, Copilot, and 30+ other agents. Install once, works everywhere.

## Combined

### What's the net savings per session?

| Layer | Savings | Mechanism |
|-------|---------|-----------|
| Bash Hook | 17.1% net (up to 99.97%) | Transparent CLI compaction |
| Caveman | 65% of output tokens | Compressed agent replies |
| MCP (AgentSkin) | 60-88% per API call | Precision JSON pruning |
| **Combined** | **60-80% of wasted context** | All three working together |

### Should I use MCP or the bash hook?

**Hook** for daily terminal work (zero overhead). **MCP** when you need custom signal/alias control. **Both** for maximum savings. The MCP paradox: MCP tools spend ~2,061 tokens per session (tool catalog + per-call framing) before saving anything. The hook saves 17.1% net because it has zero overhead.

### How do I install the full suite?

```bash
# 1. Bash hook
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc

# 2. Caveman — already active via AGENTS.md (auto-discovered by agents)

# 3. MCP servers — add to agent config or rely on .agents/mcp.json auto-discovery
```

Run `npm test` for local reproduction (4,695 tests).
