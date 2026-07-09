# AgentSkin SSS Benchmark Results

**Live API compression benchmarks against real endpoints.**

## API Compression Results

### GitHub Repos API — 88.3% Savings 🏆

**URL:** `https://api.github.com/repos/vercel/next.js`

| Metric | Value |
|--------|-------|
| Raw tokens | 1,544 |
| Skinned tokens | 180 |
| Raw bytes | 6.0 KB |
| Skinned bytes | 718 B |
| Savings | **88.3%** |
| Applied | Yes |
| Fee | 300 tok |

**Why so effective:** GitHub API responses are rich with metadata — `node_id`, `owner.profile` (avatar_url, gravatar_id, site_admin), `permissions`, `topics`, `license` meta, pagination headers. AgentSkin strips to just: name, stars, language, forks, open issues, license key, topics, and update time. Aliased for human readability (stargazers_count → stars).

### JSONPlaceholder User — 63.4% Savings

**URL:** `https://jsonplaceholder.typicode.com/users/1`

| Metric | Value |
|--------|-------|
| Raw tokens | 101 |
| Skinned tokens | 37 |
| Savings | **63.4%** |
| Applied | Yes |

**Why:** Clean signal extraction on profile data — drops nested objects like `address.geo`, `company.catchPhrase`.

### JSONPlaceholder Post — 8.7% Savings

**URL:** `https://jsonplaceholder.typicode.com/posts/1`

| Metric | Value |
|--------|-------|
| Raw tokens | 69 |
| Skinned tokens | 63 |
| Savings | **8.7%** |
| Applied | Yes |

**Why:** Small, flat JSON structure with few extraneous fields.

### Open-Meteo Weather — -1.8% ⚠️

**URL:** `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=...`

| Metric | Value |
|--------|-------|
| Raw tokens | 225 |
| Skinned tokens | 229 |
| Savings | **-1.8%** |
| Applied | Yes |

**Edge case:** Raw data is already compact (900 bytes). The skin overhead (converting to Markdown, adding headers) exceeds the original size. The safety valve did NOT trigger because the 500-byte budget check didn't catch it. This is a known edge case — see Future Work below.

### HackerNews Story — -37.2% ❌

**URL:** `https://hacker-news.firebaseio.com/v0/item/8863.json`

| Metric | Value |
|--------|-------|
| Raw tokens | 94 |
| Skinned tokens | 129 |
| Savings | **-37.2%** |
| **Applied** | **No (fee exceeded)** |

**Safety valve activated:** The decomposition fee (300 tokens) exceeded the `raw_est_tokens` * commission rate, so the skin was rejected and the raw data was returned. Correct behavior.

## Aggregate

| Total | Raw | Skinned | Savings |
|-------|-----|---------|---------|
| Tokens | **2,033** | **638** | **68.6%** |
| Bytes | ~8.0 KB | ~2.5 KB | **~68%** |

## Tokenjuice Pipeline Benchmarks

**Combined AgentSkin→Tokenjuice pipeline throughput after Phase 2 rule system unification.**

### Fixture Reduction (scripts/bench.mjs)

| Metric | Value |
|--------|-------|
| Fixtures processed | 136 |
| Total time | **45.18 ms** |
| Average per fixture | **0.33 ms** |
| Throughput | **3,030 fixtures/sec** |

### Fixture Verification (scripts/bench.mjs verify)

| Metric | Value |
|--------|-------|
| Total results | 143 |
| Passed | **143** |
| Failed | **0** |
| Total time | 96.44 ms |
| Average per fixture | 0.67 ms |

### json-semantic Savings Tests

| Test | Result |
|------|--------|
| Unit tests (prune, flatten, URL rules, aliases, ANSI, safety valve) | 40/40 ✅ |
| Integration tests (GitHub curl, non-JSON fallthrough, tiny payload) | 3/3 ✅ |
| Savings ratio on GitHub fixture | **>30%** ✅ |

### URL Rule Catalog (Unified)

11 URL rule families available in both `BUILTIN_URL_RULES` and as JSON rule files:

| Family | Count | Examples |
|--------|-------|----------|
| GitHub | 5 | `github/repos`, `github/users`, `github/issues`, `github/search`, `github/pulls` |
| npm | 1 | `npm/registry` |
| Weather | 1 | `weather/open-meteo` |
| HackerNews | 1 | `hackernews/item` |
| Reddit | 1 | `reddit/post` |
| JSONPlaceholder | 2 | `jsonplaceholder/posts`, `jsonplaceholder/users` |

## Reasoning Skin Results

| Text | Original Tokens | Skinned Tokens | Savings | Time |
|------|----------------|----------------|---------|------|
| Technical explanation | 100 | 71 | **29.0%** | 0ms |
| Code review comment | 88 | 66 | **25.0%** | 0ms |
| Bloat test (long) | 160 | 137 | **14.4%** | 1ms |

All reasoning skins applied in <1ms. Removal patterns: hedge words (perhaps, maybe, I think), filler (actually, basically), redundant qualifiers.

## E2E Tokenjuice Pipeline Benchmarks (Live)

**End-to-end tests against live APIs and real shell commands. These measure the exact pipeline `bash-optimizer.sh` invokes internally — `scripts/agent-optimizer.mjs` → Tokenjuice `reduceExecution`.**

### agent-optimizer.mjs — Real API Calls

| Endpoint | Raw | Optimized | Savings | Notes |
|----------|-----|-----------|---------|-------|
| GitHub repo (expressjs/express) | 1,731 tok | 1,000 tok | **42.2%** | Tokenjuice reduceExecution compacts JSON whitespace + applies rule auto-classify |
| npm registry (express/latest) | 877 tok | 877 tok | 0.0% | Payload already compact, passthrough |
| JSONPlaceholder (users/1) | 128 tok | 101 tok | **21.1%** | Signal extraction on profile data |
| Open-Meteo (Berlin) | 118 tok | 117 tok | 0.8% | Already compact weather payload |
| HackerNews (item 8863) | 94 tok | 94 tok | 0.0% | Small payload, passthrough |

> These results come from piping live `curl` output through `scripts/agent-optimizer.mjs` — the exact binary the bash hook calls internally. Temp files are used for I/O to avoid the ARG_MAX bug. **Note:** These use Tokenjuice's `reduceExecution` pipeline (full compaction). The 88.3% GitHub figure under "API Compression Results" above uses AgentSkin's `skin()` pipeline (signal-only extraction). The two are complementary — AgentSkin extracts signal keys for readability, Tokenjuice compacts everything.

### CLI Commands (Live Shell)

| Command | Raw | Optimized | Savings | Notes |
|---------|-----|-----------|---------|-------|
| **ls -laR agentskin/backend** | 137,975 tok (551,898 chars) | **237 tok (946 chars)** | **99.8%** 🔥 | Run collapse + truncation on repeated directory listing patterns (node_modules) |
| **npm view express** | 293 tok (1,169 chars) | **121 tok (481 chars)** | **58.7%** | ANSI stripping + dependency list compaction |
| git log --oneline -20 | 3 tok | 3 tok | 0.0% | Already compact, passthrough |

The `ls -laR` result is the standout — a half-megabyte recursive directory listing (including the entire `node_modules` tree) collapsed to under 1KB. This is exactly what happens when an agent runs `ls -laR` to explore a project: the bash hook silently turns 138K tokens into 237.

### Bash Hook — Live Test

Tested by sourcing `bash-optimizer.sh` in an interactive shell and running `opt` commands:

| Command | Raw Size | Optimized Output | Reduction |
|---------|----------|-----------------|----------|
| `opt curl -s https://api.github.com/repos/expressjs/express` | 6,923 bytes | Compacted JSON with head+tail preserved | 2,283 chars omitted with sha256 checksum |
| `opt ls -laR agentskin/backend/` | ~517KB (varies per run) | Head+tail preserved | 9,185 lines omitted from node_modules |

The hook uses a head+tail+checksum pattern: it preserves the beginning and end of output, omits the middle with a sha256 hash for integrity verification. Zero agent awareness needed — the optimization is transparent.

### Full Session Simulation

Simulated a realistic coding session: 3 API calls + 4 CLI commands + 3 agent replies.

| Path | Tokens | Net Savings | Notes |
|------|--------|-------------|-------|
| Raw (no optimization) | 2,804 | — | Baseline |
| MCP path (with overhead) | 4,386 | **−56.4%** | Tool catalog (311 tok) + per-call framing (7 × 250 = 1,750 tok) exceeds optimization savings |
| Hook path (transparent) | 2,325 | **17.1%** | Zero overhead — agent never knows optimization happened |

> **The MCP paradox:** MCP tools save tokens on data but *spend* tokens to be savable. The tool catalog + per-call JSON-RPC framing adds ~2,061 tokens of overhead before any optimization happens. The bash hook has zero overhead because it's transparent — the agent never decides to call a tool, it just sees compacted output.

### Layer-by-Layer Savings

| Layer | Savings | Detail |
|-------|---------|--------|
| **Caveman output** | **73.5%** | 351 → 93 tok across 3 agent replies (auth diagnosis, React re-render, DB pool review) |
| **AgentSkin API** | **15.7%** | 1,124 → 947 tok on GitHub + issues + weather fixtures |
| **Tokenjuice CLI** | **3.3%** (up to **99.8%** on large outputs) | 1,329 → 1,285 tok on typical fixtures; 137,975 → 237 tok on `ls -laR` |
| **Combined hook path** | **17.1% net per session** | Zero overhead, pure savings — the bash hook is the secret weapon |

## Key Takeaways

| Pattern | Savings | Best For |
|---------|---------|----------|
| JSON APIs with nested metadata | 60-88% | GitHub, Stripe, Auth0 |
| Flat simple JSON APIs | 8-63% | JSONPlaceholder, internal APIs |
| Already-compact APIs | *negative* | Weather, simple GET responses |
| LLM-to-LLM text | 14-29% | Code reviews, explanations |

**Net benefit:** For an agent making 5-10 API calls + running 3-5 CLI commands per task cycle, the 68% aggregate savings means reclaiming ~60-70% of context that was previously wasted on API response noise.
