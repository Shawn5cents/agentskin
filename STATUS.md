# Project Status

**Current sprint: Phase 1 complete, Phase 2-3 planned.**

## Phase 1: Enhance AgentSkin with Tokenjuice Patterns — ✅ COMPLETE

### Done
- [x] **text-utils.js** — Grapheme counting, ANSI stripping, token estimation, clamping, threshold checks
- [x] **api-skin-rules.js** — 11 built-in API URL rules across 6 families (github, weather, hackernews, jsonplaceholder, npm, reddit) with URL-pattern auto-classification + 3-layer config (project > user > builtin) with override/disable semantics, per-`projectRoot` cache, and full public API (`loadUserRules`, `loadProjectRules`, `mergeRuleLayers`, `getAllRules`, `clearRuleCache`, `getConfigPaths`). See [THREE-LAYER-RULES.md](./THREE-LAYER-RULES.md). 18 vitest tests.
- [x] **skin-engine.js v5.0** — Imports new utilities, smart passthrough, compaction metadata, auto-classify pipeline
- [x] **reasoning-skin.js v2.0** — Grapheme-accurate metrics
- [x] **mcp.js** — API rules, metadata responses, ANSI stripping
- [x] **69 tests passing** — All new + existing tests green
- [x] **All module syntax verified** — No parse errors

### Key Metrics
| File | Status |
|------|--------|
| `backend/lib/text-utils.js` | ✅ 8 exports, 23 tests |
| `backend/lib/api-skin-rules.js` | ✅ 8 rule families, 16 tests |
| `backend/lib/skin-engine.js` | ✅ v5.0, backward-compatible |
| `backend/lib/reasoning-skin.js` | ✅ v2.0, backward-compatible |
| `backend/mcp.js` | ✅ Auto-classify + metadata |
| `tests/*` | ✅ 69/69 passing (136ms) |

## Phase 2: Enhance Tokenjuice with AgentSkin Patterns — ✅ COMPLETE

### Done
- [x] **Port `recursive_prune` as `json-semantic` reducer** — New 510-line module with 40 unit tests. Exports `pruneJson()`, `flattenJson()`, `findUrlRule()`, `applyJsonSemantic()`, token estimators, compaction metadata helpers, and all types.
- [x] **Wire into `reduce.ts`** — Rules can now declare `jsonSemantic` config. When a matched rule has it, JSON output is parsed and run through `applyJsonSemantic()`. Added 3 integration tests, 2 example rules (GitHub, npm), and unified CompactionKind types.
- [x] **Add MCP server mode to Tokenjuice** — New `src/hosts/mcp/index.ts` with 5 tools: `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, `reduce`. Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`, rate limiting (60 req/60s), 30s timeout, Zod validation. All 6 end-to-end tests passing.
- [x] **Merge rule systems under unified schema** — Added `urlIncludes`/`urlIncludesAny` to `RuleMatch` type, schema, and validator. `classify.ts` now extracts URLs from `argv`/`command` and matches against URL patterns. Ported 5 missing AgentSkin rules (`github/search`, `github/pulls`, `weather/open-meteo`, `hackernews/item`, `reddit/post`) into `BUILTIN_URL_RULES` (now 11 families). Created 7 new JSON rule files + 7 fixture files in `src/rules/network/`.
- [x] **Run combined pipeline benchmarks** — 143/143 fixtures verify clean, 43/43 json-semantic tests pass, **3,030 fixtures/sec** pipeline throughput (0.33ms avg).

### Key Metrics
| File | Status |
|------|--------|
| `src/core/json-semantic.ts` | ✅ 11 URL rules, 40 unit tests |
| `src/core/classify.ts` | ✅ URL match logic + scoring |
| `src/hosts/mcp/index.ts` | ✅ 5 tools, 6 e2e tests |
| `src/rules/network/curl-*.json` | ✅ 7 URL-targeted rules |
| `src/rules/fixtures/network/curl-*.fixture.json` | ✅ 7 fixtures, 143/143 pass |
| `src/types.ts` + `validate-rules.ts` + schema | ✅ `urlIncludes`/`urlIncludesAny` |
| `scripts/bench.mjs` | ✅ 45.18ms (136 fixtures), 96.44ms verify (143 results) |

## Phase 3: MCP Server Integration & Shell Hooks — ✅ COMPLETE

### Done
- [x] **3a:** Created `.agents/mcp.json` with two MCP servers (`agentskin-mcp` at 30 req/60s, `tokenjuice-mcp` at 60 req/60s) — zero code changes, works with any MCP-aware agent (Claude Code, Cursor, Copilot Chat, Continue, Cline, etc.)
- [x] **3b:** Created two Composio tool configs (`.agents/composio/agentskin.json` → `skin_api_response` with signals/aliases/autoClassify, `.agents/composio/tokenjuice.json` → `tokenjuice_reduce` with command/cwd/trace) — optional integration for Composio-based agent workflows
- [x] **3c:** Instrumented bash hook for transparent optimization in any terminal — `.agents/hooks/bash-optimizer.sh` + `scripts/agent-optimizer.mjs` (Node.js shim) + `install.sh` / `uninstall.sh` / `README.md`. Cross-platform timestamps, 10 MiB raw cap, aliases OFF by default, full compact result cached at `~/.cache/tokenjuice/<id>.json`
- [x] **Fix ARG_MAX bug in `bash-optimizer.sh`:** The payload builder passed raw stdout as a `node -e` command-line argument, hitting Linux's 2 MB `ARG_MAX`. Commands with >~23 KB output silently produced empty optimizer input. Fixed by passing temp file **paths** (not content) as argv and having node read them via `fs.readFileSync`. Verified on a 3.1 MB / 56,947-line directory listing: **3,192,814 → 897 chars (99.97% reduction, 18 lines)**.
- [x] **Tested end-to-end pipeline** — `opt curl https://api.github.com/...` → 7,662 chars returned via hook; `agent-optimizer.mjs` end-to-end test on `git status` → 215→115 chars (53.5% ratio)
- [x] **Updated test expectations** — `test/core/rules.test.ts` now expects 136 rules + 143 fixtures to match Phase 2's 7 new network rules. All 55 tests pass.

### Key Metrics
| File | Status |
|------|--------|
| `.agents/mcp.json` | ✅ 2 MCP servers (AgentSkin + Tokenjuice) |
| `.agents/composio/agentskin.json` | ✅ `skin_api_response` tool (v2.0.0) |
| `.agents/composio/tokenjuice.json` | ✅ `tokenjuice_reduce` tool (v0.8.0) |
| `.agents/hooks/bash-optimizer.sh` | ✅ Source hook, `opt` command. **`ARG_MAX` fix applied.** See README. |
| `.agents/hooks/install.sh` + `uninstall.sh` | ✅ Idempotent `~/.bashrc` integration |
| `.agents/hooks/README.md` | ✅ Usage + env vars + integration notes |
| `scripts/agent-optimizer.mjs` | ✅ Node.js shim → `reduceExecution` |
| `test/core/rules.test.ts` | ✅ 136 rules / 143 fixtures expected |

## Verified MCP Tool Inventory

The tool inventories below were verified by sending a `tools/list` JSON-RPC request to each running MCP server (post-`initialize` + `notifications/initialized` handshake). Both servers are launched by the shell wrappers in `.agents/mcp/*.sh`, which MCP clients discover via `.agents/mcp.json`.

### `agentskin-mcp` — `agentskin-sss` v2.0.0 (4 tools)

| Tool | Purpose | Required params | Key optional params |
|------|---------|-----------------|---------------------|
| `fetch_optimized_data` | Fetch any API/Web URL and return a token-optimized "Skin" (up to 88% token reduction for structured JSON) with auto-classification for GitHub, npm, HackerNews, weather APIs, etc. | `url` | `signals`, `aliases`, `apply_reasoning`, `auto_classify` |
| `skin_reasoning` | Optimize natural language text by removing linguistic noise (hedging, filler words, redundant phrases). 14–29% typical reduction. | `text` | — |
| `classify_url` | Check if a URL matches any built-in API skin rules (GitHub, npm, weather, etc.). Returns matched rule with signals/aliases, or null. | `url` | — |
| `strip_ansi` | Strip ANSI escape codes from text. | `text` | — |

### `tokenjuice-mcp` — `tokenjuice-mcp` v0.8.0 (5 tools)

| Tool | Purpose | Required params | Key optional params |
|------|---------|-----------------|---------------------|
| `apply_json_semantic` | Prune a JSON string using signal keys (AgentSkin-style semantic pruning). Keeps only matching keys, optionally remaps via aliases, flattens to key:value markdown. Up to 88% reduction. | `json` | `url`, `signals`, `aliases`, `stripAnsiCodes`, `smallThreshold` |
| `classify_url` | Match a URL against built-in API skin rules (GitHub repos/users, npm registry, etc.). Returns matched rule with signals, aliases, and URL pattern. | `url` | — |
| `strip_ansi` | Strip ANSI escape codes from terminal output. Handles CSI, OSC, incomplete sequences, and single-char escapes. | `text` | — |
| `estimate_tokens` | Estimate token count for a string using grapheme-aware counting (÷ 4). | `text` | — |
| `reduce` | Run the full Tokenjuice reduction pipeline on command output. Applies rule matching, ANSI stripping, truncation, JSON semantic pruning, and other reducers. | `command`, `output` | `cwd`, `exitCode` |

> **Note on overlap:** `classify_url` and `strip_ansi` appear in both servers because both wrappers expose a small subset of the same underlying utilities. They are independent implementations registered on different MCP daemons — call whichever the routing layer prefers.

## Known Edge Cases

| Issue | Status | Notes |
|-------|--------|-------|
| Weather API ±0% | Known | Raw data already compact; safety valve needs min-size precheck |
| ANSI regex on Node 18 | Untested | `replaceAll()` available in Node 16+; `Intl.Segmenter` in Node 20+ |
| CJK grapheme counting | Verified | Correct with `Intl.Segmenter`, reasonable fallback with `Array.from()` |
| Very large payloads (>1MB) | Fixed | `ARG_MAX` bug in `bash-optimizer.sh`'s `node -e` payload builder (raw output passed as argv). Fixed Jun 14 — now reads temp files via `fs.readFileSync`. Verified 3.1 MB → 897 chars (99.97% reduction). Recursive_json prune still has `maxDepth: 20` with no budget for very large objects, but the optimizer pipeline can handle multi-MB inputs. |

## How to Validate

```bash
# 1. Run AgentSkin tests
cd ~/Desktop/agentskin && npx vitest run

# 2. Run benchmark
node /tmp/agentskin-benchmark.js

# 3. Test AgentSkin MCP server manually via the shell launcher
#    (the project-root .agents/ directory is discovered by MCP clients at startup)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  bash .agents/mcp/agentskin-mcp.sh

# 3b. Same for Tokenjuice (also promoted to the project root)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  bash .agents/mcp/tokenjuice-mcp.sh

# 4. Test skin transformation
node -e "
  import('./backend/lib/skin-engine.js').then(m => {
    const r = m.skin({ name: 'test', secret: 'hidden' }, { signals: ['name'] });
    console.log(JSON.stringify(r, null, 2));
  });
"
```
