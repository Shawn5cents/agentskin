# Tokenjuice ↔ AgentSkin Cross-Pollination

**Phase 2: What each project can learn from the other.**

## Tokenjuice Strengths (What AgentSkin Gained)

| Tokenjuice Pattern | Ported To AgentSkin | Status |
|-------------------|-------------------|--------|
| Grapheme-aware counting (`Intl.Segmenter`) | `text-utils.js` | ✅ Complete |
| 5-pattern ANSI stripping | `text-utils.js` | ✅ Complete |
| Rule-based classification | `api-skin-rules.js` | ✅ Complete |
| Compaction metadata | `skin-engine.js` | ✅ Complete |
| Smart passthrough | `skin-engine.js` | ✅ Complete |
| 3-layer rule config (builtin/user/project) | Planned | 📋 Next |
| URL-domain safety policies | Planned | 📋 Next |

## AgentSkin Strengths (What Tokenjuice Could Gain)

| AgentSkin Pattern | Description | Priority |
|------------------|-------------|----------|
| **Recursive JSON pruning** (`recursive_prune`) | Walks JSON objects/arrays, keeps only keys matching signal set. Tokenjuice has NO JSON handling — all rules target CLI text output. | 🔴 High |
| **MCP server distribution** | Tokenjuice is a CLI binary. Adding an MCP server mode would let it integrate directly into Claude Code, Cursor, Copilot Chat, and other MCP-aware agents. | 🔴 High |
| **Reasoning skin** | Text-level noise removal for LLM-to-LLM communication. Could be a new rule type in Tokenjuice (type: "reasoning"). | 🟡 Medium |
| **Semantic aliasing** | `stargazers_count → stars` remapping makes output more readable. Could be a new rule transform in Tokenjuice. | 🟡 Medium |
| **Safety valve / fee model** | If skin > raw, reject. A novel trust mechanism. | 🟢 Lower |

## Proposed Tokenjuice Enhancement: JSON Semantic Pruning

Add a new rule type to Tokenjuice for JSON API responses:

```json
{
  "type": "json-semantic",
  "match": {
    "urlContains": "api.github.com"
  },
  "signals": ["name", "description", "stargazers_count", "language"],
  "aliases": {
    "stargazers_count": "stars"
  },
  "reducer": "semantic-prune"
}
```

This would allow Tokenjuice to handle `curl https://api.github.com/repos/owner/repo` output with the same 88% savings AgentSkin achieves.

## Rule Schema Comparison

| Feature | Tokenjuice | AgentSkin | Unified (Phase 2) |
|---------|-----------|-----------|-------------------|
| Rule format | JSON files in `src/rules/` | JS objects in `api-skin-rules.js` | Tokenjuice JSON (single source) |
| Match criteria | Command name + arguments | URL patterns (`urlIncludes`, `urlIncludesAny`) | **Both** — `argv0`, `argvIncludes`, `commandIncludes`, `urlIncludes`, `urlIncludesAny` |
| Reducers | `compact`, `truncate`, `inspect-summary`, `full-diff` | `recursive_prune`, `to_markdown_skin`, `skinReasoning` | All of Tokenjuice's + `jsonSemantic` dispatch |
| Output | Reduced terminal text | Markdown-formatted key-value pairs | Same |
| Safety policies | Domain-aware (read vs mutation commands) | Size-based (raw > skin validation) | Both |
| Metadata | CompactionMetadata with authoritative flag | CompactionMetadata with kinds array | Unified: 5 `CompactionKind` values |
| URL rules | None | 11 built-in families | **11 built-in families** in `BUILTIN_URL_RULES` + JSON rule files |

## Integration Plan

1. **Port `recursive_prune`** as a new Tokenjuice reducer (`json-semantic`) ✅
   - Created `src/core/json-semantic.ts` with `pruneJson()`, `flattenJson()`, `findUrlRule()`, `applyJsonSemantic()`, token estimators, compaction metadata helpers
   - 40 unit tests covering pruning, flattening, URL rules, aliases, ANSI stripping, safety valve, and end-to-end pipeline
2. **Wire into `reduce.ts`** — Rules can declare `jsonSemantic` config ✅
   - Added `JsonSemanticRule` type to `src/types.ts` and `jsonSemantic` field to `JsonRule`
   - Updated rule schema and validation (`tokenjuice-rule.schema.json`, `validate-rules.ts`)
   - Added json-semantic dispatch in `reduce.ts`: matched rule with `jsonSemantic` → parse JSON → `applyJsonSemantic()` → return pruned skin
   - Created example rules: `curl-github.json`, `curl-npm.json`
   - 3 integration tests verifying end-to-end pipeline
   - Unified CompactionKind types across json-semantic and compaction-metadata modules
3. **Add MCP server mode** to Tokenjuice distribution ✅
   - Created `src/hosts/mcp/index.ts` following AgentSkin's MCP pattern (`StdioServerTransport`, `ListToolsRequestSchema`/`CallToolRequestSchema`)
   - 5 tools exposed: `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, `reduce`
   - Rate limiting (60 req/60s), 30s timeout wrapper, Zod validation on all tool inputs
   - Added `@modelcontextprotocol/sdk` + `zod` runtime dependencies
   - Added `./mcp` subpath export to `package.json`
   - Verified: TypeScript clean, all 6 end-to-end JSON-RPC tests passing (tools/list, classify_url, strip_ansi, estimate_tokens, apply_json_semantic, reduce)
4. **Merge rule systems** — Tokenjuice's CLI rules + AgentSkin's URL rules under one schema ✅
   - Added `urlIncludes` and `urlIncludesAny` fields to `RuleMatch` type (`src/types.ts`)
   - Updated rule schema (`tokenjuice-rule.schema.json`) and validation (`validate-rules.ts`) to support URL match fields
   - Added `extractUrlFromInput()` and `matchesUrlRule()` helpers in `classify.ts` — rules can now match against URLs extracted from `argv` or `command` string
   - Updated `scoreRule()` to include URL match weights (urlIncludes: 30 pts, urlIncludesAny: 25 pts)
   - Ported 5 missing AgentSkin URL rules to `BUILTIN_URL_RULES`: `github/search`, `github/pulls`, `weather/open-meteo`, `hackernews/item`, `reddit/post` (now 11 total families)
   - Created 7 new JSON rule files in `src/rules/network/`: `curl-github.json`, `curl-github-search.json`, `curl-github-pulls.json`, `curl-npm.json`, `curl-weather.json`, `curl-hackernews.json`, `curl-reddit.json`
   - Created 7 corresponding fixture files in `src/rules/fixtures/network/`
5. **Benchmark combined pipeline** — API response → AgentSkin prune → Tokenjuice compact ✅
   - 143/143 fixture verification passes (0 failures)
   - 43/43 json-semantic tests pass (40 unit + 3 integration)
   - 136 fixtures reduce in 45.18ms total (**3,030 fixtures/sec**, 0.33ms avg)
   - 143 fixtures verify in 96.44ms (0.67ms avg)
   - All 11 AgentSkin URL rules available in both `BUILTIN_URL_RULES` and as JSON rule files
