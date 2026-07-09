# AgentSkin Suite: Protocol State

## Current Version: 5.0.0 (Suite)
**Date:** July 2026

---

## 🏛️ Core Architecture: AgentSkin Suite

AgentSkin Suite is a three-layer token optimization stack combining:

| Layer | Component | Creator | Savings |
|-------|-----------|---------|---------|
| 1 | **AgentSkin SSS** — Semantic JSON pruning via MCP | Shawn Nichols Sr. | 88%+ on rich APIs |
| 2 | **Tokenjuice** — Rule-driven CLI output compaction | Vincent Koc | 99.8% on large outputs |
| 3 | **Caveman** — Output compression via prompt engineering | Julius Brussee | 65% on agent replies |

**Combined:** 4,695 tests passing, 9 MCP tools, 17.1% net session savings (zero overhead).

---

## 📊 Phase Completion

### Phase 1: Enhance AgentSkin with Tokenjuice Patterns — ✅ COMPLETE

- [x] **text-utils.js** — Grapheme counting, ANSI stripping, token estimation, clamping, threshold checks
- [x] **api-skin-rules.js** — 11 built-in API URL rules across 6 families with 3-layer config (project > user > builtin)
- [x] **skin-engine.js v5.0** — Smart passthrough, compaction metadata, auto-classify pipeline
- [x] **reasoning-skin.js v2.0** — Grapheme-accurate metrics
- [x] **mcp.js** — API rules, metadata responses, ANSI stripping
- [x] **69 tests passing** — All new + existing tests green

### Phase 2: Enhance Tokenjuice with AgentSkin Patterns — ✅ COMPLETE

- [x] **Port `recursive_prune` as `json-semantic` reducer** — 510-line module, 40 unit tests
- [x] **Wire into `reduce.ts`** — Rules declare `jsonSemantic` config, JSON output parsed and pruned
- [x] **Add MCP server mode to Tokenjuice** — 5 tools, rate limiting, Zod validation
- [x] **Merge rule systems under unified schema** — 11 URL rule families, JSON rule files
- [x] **Benchmark combined pipeline** — 3,030 fixtures/sec throughput

### Phase 3: MCP Server Integration & Shell Hooks — ✅ COMPLETE

- [x] **3a:** Created `.agents/mcp.json` with two MCP servers (agentskin-mcp + tokenjuice-mcp)
- [x] **3b:** Created Composio tool configs for both servers
- [x] **3c:** Instrumented bash hook for transparent optimization — `opt` command, ARG_MAX fix applied
- [x] **End-to-end pipeline tested** — Verified 99.97% reduction on 3.1MB directory listings

---

## 🔌 MCP Tool Inventory

### `agentskin-mcp` — 4 tools

| Tool | Purpose |
|------|---------|
| `fetch_optimized_data` | Fetch any URL, return pruned Markdown skin (up to 88% reduction) |
| `skin_reasoning` | Strip linguistic noise from LLM-to-LLM text (14–29% savings) |
| `classify_url` | Match URL against 11 built-in API rules |
| `strip_ansi` | Strip ANSI escape codes from text |

### `tokenjuice-mcp` — 5 tools

| Tool | Purpose |
|------|---------|
| `apply_json_semantic` | AgentSkin-style JSON pruning via signal keys |
| `classify_url` | URL extraction + rule scoring |
| `strip_ansi` | 5-pattern ANSI stripping |
| `estimate_tokens` | Grapheme-accurate token estimation |
| `reduce` | Full reduction pipeline on CLI command output |

---

## 🛡️ Security Features

- **SSRF Protection:** All IPv4 private ranges, IPv6 link-local/loopback, cloud metadata blocking
- **Rate Limiting:** 30 req/min (AgentSkin), 60 req/min (Tokenjuice) sliding window
- **Input Validation:** Zod schemas for all tool inputs
- **Processing Limits:** 30s timeout, 5MB response cap

---

## 📈 Test Coverage

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| AgentSkin | 141 | 2,410 | ✅ 100% |
| Tokenjuice | 133 | 2,285 | ✅ 100% |
| **Combined** | **274** | **4,695** | **✅ Zero failures** |

---

## 📊 Benchmarks

| Metric | Value |
|--------|-------|
| GitHub API savings | 88.3% (1,544 → 180 tokens) |
| `ls -laR` savings | 99.97% (3.19M → 897 chars) |
| `npm view express` savings | 58.7% |
| Caveman reply compression | 65% |
| Pipeline throughput | 3,030 fixtures/sec |

---

## Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** | AgentSkin SSS protocol, MCP server, Suite integration |
| **Vincent Koc** | Tokenjuice — MIT-licensed CLI output compactor |
| **Julius Brussee** | Caveman — [github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |

---

*Maintained by Nichols Transco LLC. Built for the machine economy.*
