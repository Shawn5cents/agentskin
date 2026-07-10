# AgentSkin Suite

[![npm version](https://img.shields.io/npm/v/agentskin.svg)](https://npmjs.org/package/agentskin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The complete token optimization stack for AI coding agents.** Three complementary tools that eliminate the "Token Tax" across the full agent cycle — API responses, CLI output, and agent replies.

## The Suite

| Component | What It Does | Savings | Creator |
|-----------|-------------|---------|---------|
| **AgentSkin SSS** | Semantic JSON pruning via MCP | 60–88% on rich APIs | Shawn Nichols Sr. |
| **Tokenjuice CLI** | Rule-driven terminal output compaction | Up to 99.97% on large outputs | [Vincent Koc](https://github.com/vincentkoc/tokenjuice) (MIT) |
| **Caveman** | Output compression via prompt engineering | 65% output reduction | [Julius Brussee](https://github.com/JuliusBrussee/caveman) |

## Quick Start

```bash
# 1. AgentSkin MCP server
npx -y agentskin@latest

# 2. Bash hook (transparent CLI optimization)
source .agents/hooks/bash-optimizer.sh

# 3. Caveman — already active via AGENTS.md
```

## By the Numbers

| Metric | Value |
|--------|-------|
| GitHub API savings | **88.3%** (1,544 → 180 tokens) |
| `ls -laR` directory listing | **99.97%** (3.19M → 897 chars) |
| Caveman output compression | **65%** average |
| Caveman memory compression | **46%** smaller |
| MCP tools | **7** across unified server |
| Combined test suite | **4,695 tests**, 274 files — 100% passing |
| Pipeline throughput | **3,030 fixtures/sec** (0.33ms avg) |
| Net session savings | **17.1%** (zero overhead via bash hook) |

## Tools

### AgentSkin Suite MCP (7 tools, unified)
`fetch_optimized_data` · `skin_reasoning` · `classify_url` · `strip_ansi` · `reduce` · `estimate_tokens` · `apply_json_semantic`

### Caveman Skills (6 skills)
`caveman` · `caveman-commit` · `caveman-review` · `caveman-stats` · `caveman-compress` · `cavecrew`

## Documentation

| Doc | Description |
|-----|-------------|
| [OVERVIEW.md](OVERVIEW.md) | Project overview and quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture and data flow |
| [STATUS.md](STATUS.md) | Phase completion and test coverage |
| [BENCHMARK.md](BENCHMARK.md) | Live API compression benchmarks |
| [USAGE.md](USAGE.md) | Full usage guide — hook, caveman, MCP |
| [THREE-LAYER-RULES.md](THREE-LAYER-RULES.md) | Rule config override semantics |
| [AUTHORS.md](AUTHORS.md) | Credits and component details |

## Security

- **SSRF Protection:** Blocks private IPv4/IPv6 ranges and cloud metadata services
- **Rate Limiting:** 60 req/min sliding window
- **Input Validation:** Zod schemas for all tool inputs
- **Processing Timeout:** 30-second limit

## Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, Suite integration |
| **Vincent Koc** | Tokenjuice — [MIT License](https://github.com/vincentkoc/tokenjuice) |
| **Julius Brussee** | Caveman — [github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |

## Website

[agentskin.dev](https://agentskin.dev) — Protocol specification, examples, FAQ, and whitepaper.

---

*© 2026 Nichols Transco LLC.*
