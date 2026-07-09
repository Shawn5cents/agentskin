# AgentSkin Suite: Semantic Shorthand Standard (SSS)

[![npm version](https://img.shields.io/npm/v/agentskin.svg)](https://npmjs.org/package/agentskin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AgentSkin Suite is an open-source token optimization stack for AI coding agents. It combines three complementary tools that eliminate the "Token Tax" across the full agent cycle — API responses, CLI output, and agent replies.

## The Suite

| Component | What It Does | Savings |
|-----------|-------------|---------|
| **AgentSkin SSS** | Semantic JSON pruning via MCP — strips noise from API responses | 60–88% on rich APIs |
| **Tokenjuice CLI** | Rule-driven terminal output compaction — strips ANSI, compacts git/build/lint | Up to 99.97% on large outputs |
| **Caveman** | Output compression via prompt engineering — cuts agent reply verbosity | 65% output token reduction |

Combined, they reclaim **60–80%** of context that was previously wasted on noise.

## The Protocol

The core of AgentSkin is the recursive pruning engine. It operates on a simple, declarative standard:
1. **Audit:** Intercept raw data payloads.
2. **Signal Mapping:** Define an array of required, high-density keys.
3. **Semantic Pivot:** Apply an alias map to standardize inconsistent API schemas into a unified namespace.
4. **Flatten:** Output a deterministic, hierarchical Markdown string.

## Quickstart (MCP Server)

You can run the AgentSkin reference server directly via `npx` to provide your local AI assistants (Claude Desktop, Cursor, etc.) with the `fetch_optimized_data` tool.

```bash
npx -y agentskin@latest
```

### Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentskin": {
      "command": "npx",
      "args": ["-y", "agentskin@latest"]
    }
  }
}
```

### Full Suite Setup

For the complete token optimization stack, connect both MCP servers and source the bash hook:

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

```bash
# Bash hook for transparent CLI optimization
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc
```

## Tools

The suite exposes **9 tools** across two MCP servers:

### AgentSkin MCP (4 tools)

| Tool | Description |
|------|-------------|
| `fetch_optimized_data` | Fetch any API/Web URL and return a token-optimized "Skin" (up to 88% reduction) with auto-classification for GitHub, npm, HackerNews, weather APIs |
| `skin_reasoning` | Optimize natural language text by removing linguistic noise (hedging, filler). 14–29% typical reduction |
| `classify_url` | Match a URL against 11 built-in API skin rules |
| `strip_ansi` | Strip 5 patterns of ANSI escape codes from text |

### Tokenjuice MCP (5 tools)

| Tool | Description |
|------|-------------|
| `apply_json_semantic` | AgentSkin-style JSON pruning — extract signal keys, apply URL rules, flatten to markdown |
| `classify_url` | Match a URL against built-in API skin rules |
| `strip_ansi` | Strip ANSI escape codes from terminal output |
| `estimate_tokens` | Grapheme-aware token count estimation (÷ 4) |
| `reduce` | Full Tokenjuice reduction pipeline on command output |

### Caveman Skills (6 skills)

| Skill | What It Does |
|-------|-------------|
| `caveman` | Ultra-compressed output — drops filler, uses fragments, cuts 65% |
| `caveman-commit` | Generates compact Conventional Commits |
| `caveman-review` | One-line code review comments: location, problem, fix |
| `caveman-stats` | Shows real token usage and savings for the session |
| `caveman-compress` | Rewrites memory files to caveman-speak — 46% smaller permanently |
| `cavecrew` | Delegates to compressed subagents (investigator, builder, reviewer) |

## Creating a Skin

AgentSkin is a factory for intelligent perception. You provide the mapping; the protocol provides the engine.

When using the `fetch_optimized_data` tool, provide the `signals` and `aliases` parameters to build your own skin.

**Example: Weather API Skin**
```json
{
  "url": "https://api.weather.gov/gridpoints/TOP/31,80/forecast",
  "signals": ["temperature", "windspeed", "shortforecast"],
  "aliases": {
    "temperature": "temp",
    "shortforecast": "forecast"
  }
}
```

## Architecture

This package is designed as a **Local-First, Open Studio**.
- All data fetching and pruning happens locally on the host machine.
- User session state, cookies, and network access remain strictly local and private.
- The core engine (`skin-engine.js`) operates without external dependencies for transformation.
- The bash hook intercepts noisy CLI commands and pipes output through Tokenjuice before the agent sees it — zero overhead, zero agent awareness.

## Security

The reference implementation includes robust security measures:
- **SSRF Protection:** Blocks private network ranges (IPv4: 127.x, 10.x, 172.16-31.x, 192.168.x; IPv6: ::1, ::ffff:, fe80:)
- **Cloud Metadata Blocking:** Prevents access to GCP, Azure, and Kubernetes metadata services
- **Rate Limiting:** 30 requests/minute (AgentSkin), 60 requests/minute (Tokenjuice) sliding window per client
- **Input Validation:** All tool inputs validated with Zod schemas
- **URL Sanitization:** Dangerous URL schemes (javascript:, data:) stripped from HTML links
- **Processing Timeout:** 30s limit prevents resource exhaustion

## Benchmarks

| Metric | Value |
|--------|-------|
| GitHub API savings | 88.3% (1,544 → 180 tokens) |
| `ls -laR` directory listing | 99.97% (3.19M → 897 chars) |
| Caveman output compression | 65% average |
| Caveman memory file compression | 46% smaller |
| Combined test suite | 4,695 tests, 274 files — 100% passing |
| Pipeline throughput | 3,030 fixtures/sec (0.33ms avg) |

## Testing

```bash
# AgentSkin tests
cd agentskin && npx vitest run

# Tokenjuice tests
cd tokenjuice-extracted/tokenjuice-main && npx vitest run

# Combined benchmark
node /tmp/agentskin-benchmark.js
```

## Specification & Benchmarks

- [Formal Specification](docs/SPECIFICATION.md)
- [FAQ with Benchmarks](docs/FAQ.md)
- [Local Benchmarks](benchmarks/run.js) `npm run benchmark`

Online docs: [agentskin.dev](https://agentskin.dev)

## Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, AgentSkin Suite |
| **Vincent Koc** | Tokenjuice — [MIT License](https://github.com/vincentkoc/tokenjuice) |
| **Julius Brussee** | Caveman — [github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |

---

*Maintained by Nichols Transco LLC. Built for the machine economy.*
