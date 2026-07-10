# Technical Architecture

**How AgentSkin v5.0 works, end-to-end.**

## Data Flow

```
Raw JSON/Text Input
        │
        ▼
┌─────────────────────────────┐
│    1. Pre-processing        │
│  • stripAnsi() (optional)   │
│  • isBelowSkinThreshold()   │
│    — If below: bypass       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    2. URL Classification    │
│  • findMatchingRule(url)    │
│    — Rule match found?      │
│      → Use rule signals     │
│    — No rule match?         │
│      → Use manual/explicit  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    3. Semantic Pruning      │
│  • recursive_prune()        │
│    — Walks JSON tree        │
│    — Keeps only signal keys │
│    — Applies aliases        │
│  • to_markdown_skin()       │
│    — Flattens to key: val   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    4. Safety Valve          │
│  • skin_size > raw_size?    │
│    → Return raw (no-op)     │
│  • Create CompactionMeta   │
│    — kinds, authoritative   │
└──────────┬──────────────────┘
           │
           ▼
    Return: { skin, metrics, compaction }
```

## Tokenjuice JSON-Semantic Integration (Phase 2)

**New module added to Tokenjuice's rule engine for JSON API response pruning.**

### Data Flow (within Tokenjuice)

```
curl https://api.github.com/repos/owner/repo
        │
        ▼
┌─────────────────────────────────┐
│   reduce.ts — Rule Dispatch     │
│  • Match command against rules  │
│  • Found rule with jsonSemantic │
│    → Enter json-semantic path   │
│  • No jsonSemantic rule         │
│    → Normal compact/truncate    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   json-semantic.ts — Pipeline   │
│  • Parse raw text as JSON       │
│  • findUrlRule(url)             │
│    → Select signals + aliases   │
│  • stripAnsi() (optional)       │
│  • pruneJson(obj, signals,      │
│      aliases)                   │
│    → Recursive key pruning      │
│  • flattenJson(pruned, aliases) │
│    → key: value markdown        │
│  • Safety valve (skin > raw?)   │
│    → Return raw passthrough     │
└──────────┬──────────────────────┘
           │
           ▼
    Return: CompactResult with    
    skin + metadata + compaction  
```

### Rule Format

```json
{
  "family": "network",
  "match": { "commandIncludes": "api.github.com" },
  "jsonSemantic": {
    "urlMatches": "api.github.com",
    "signals": ["name", "description", "stargazers_count"]
  }
}
```

The `jsonSemantic` field on a rule declares that JSON output from that command should be semantically pruned. The dispatch in `reduce.ts` handles parsing, pruning, and falling through on non-JSON output.

### Key Files

| File | Status |
|------|--------|
| `src/core/json-semantic.ts` | ✅ ~510 lines, 40 unit tests |
| `src/core/reduce.ts` | ✅ Extended with json-semantic dispatch |
| `src/types.ts` | ✅ Added JsonSemanticRule type |
| `src/rules/tokenjuice-rule.schema.json` | ✅ Added jsonSemantic property |
| `src/core/validate-rules.ts` | ✅ Added jsonSemantic validation |
| `src/rules/network/curl-github.json` | ✅ Example rule |
| `src/rules/network/curl-npm.json` | ✅ Example rule |
| `test/core/json-semantic-integration.test.ts` | ✅ 3 integration tests |

### Compaction Kinds

Shared `CompactionKind` values (in `compaction-metadata.ts`):
- `signal-prune` — Key-level JSON pruning
- `alias-remap` — Key alias renaming for readability
- `small-passthrough` — Payload below threshold (no-op)
- `rule-auto-classify` — URL-based rule matching
- `raw-passthrough` — Safety valve triggered (skin > raw)

## Tokenjuice MCP Server (Phase 2)

**MCP server exposing Tokenjuice's reduction capabilities via the Model Context Protocol.**

### Architecture

```
MCP Client (Claude Code, Cursor, Copilot Chat, ...)
        │
        ▼  JSON-RPC (stdin/stdout)
┌─────────────────────────────────┐
│   src/hosts/mcp/index.ts        │
│  • StdioServerTransport         │
│  • Rate limiting (60 req/60s)   │
│  • 30s timeout wrapper          │
│  • Zod input validation         │
└──────────┬──────────────────────┘
           │
    ┌──────┼──────┬──────┬──────┐
    ▼      ▼      ▼      ▼      ▼
 json-   text   reduce  text  json-
semantic .ts    .ts     .ts   semantic
  .ts                          .ts
(apply_  (strip (reduce (estim (classify
 semantic)_ansi)       )ate    _url)
                         tokens)
```

### Exposed Tools

| Tool | Handler | Source Module |
|------|---------|--------------|
| `apply_json_semantic` | Parse JSON + prune via signal keys + flatten to markdown | `json-semantic.ts` |
| `classify_url` | Match URL against built-in API rules | `json-semantic.ts` (findUrlRule) |
| `strip_ansi` | Strip 5 types of ANSI escape sequences | `text.ts` (stripAnsi) |
| `estimate_tokens` | Grapheme-accurate token estimation (÷ 4) | `json-semantic.ts` (estimateTokens) |
| `reduce` | Run full Tokenjuice reduction pipeline on command output | `reduce.ts` (reduceExecution) |

### Usage

```bash
# Start server
node dist/hosts/mcp/index.js

# Or via MCP client config (e.g. claude_desktop_config.json):
{
  "mcpServers": {
    "tokenjuice": {
      "command": "node",
      "args": ["/path/to/tokenjuice/dist/hosts/mcp/index.js"]
    }
  }
}
```

### Security

- **Rate limiting:** 60 requests per 60-second sliding window
- **Timeout:** 30-second maximum processing time per request
- **Validation:** All tool inputs validated through Zod schemas
- **Error handling:** Errors returned as MCP text content, never leaked to stderr

## Rule System Unification (Phase 2)

**Tokenjuice's CLI rules and AgentSkin's URL rules now share a single schema.**

### Match Criteria

| Field | Type | Description |
|-------|------|-------------|
| `toolNames` | `string[]` | Match by tool name (e.g., `"exec"`) |
| `argv0` | `string[]` | Match first argv element (e.g., `"curl"`) |
| `gitSubcommands` | `string[]` | Match git subcommand |
| `argvIncludes` | `string[][]` | Match argv containing all of each sub-array |
| `argvIncludesAny` | `string[][]` | Match argv containing at least one sub-array |
| `commandIncludes` | `string[]` | Match command string containing all (word-boundary) |
| `commandIncludesAny` | `string[]` | Match command string containing at least one |
| `urlIncludes` | `string[]` | Match URL containing all (case-insensitive) |
| `urlIncludesAny` | `string[]` | Match URL containing at least one (case-insensitive) |

### URL Extraction

`classify.ts` extracts the first `http://` or `https://` URL from:
1. Each element of `argv` (exact match)
2. The `command` string (regex fallback)

### URL Rule Scoring

`scoreRule()` adds to the rule score:
- `urlIncludes.length × 30` per matching field
- `urlIncludesAny.length × 25` per matching field

This ensures more specific URL patterns (e.g., `api.github.com/search/`) outscore broader ones (e.g., `api.github.com`).

### Unified URL Rule Catalog (11 families)

| Family | Rule ID | URL Pattern |
|--------|---------|-------------|
| GitHub | `github/repos` | `api.github.com/repos/` |
| GitHub | `github/users` | `api.github.com/users/` |
| GitHub | `github/issues` | `api.github.com/repos/` + `/issues` |
| GitHub | `github/search` | `api.github.com/search/` |
| GitHub | `github/pulls` | `api.github.com/repos/` + `/pulls` |
| Weather | `weather/open-meteo` | `api.open-meteo.com` |
| HackerNews | `hackernews/item` | `hacker-news.firebaseio.com` |
| npm | `npm/registry` | `registry.npmjs.org` |
| Reddit | `reddit/post` | `reddit.com` or `oauth.reddit.com` |
| JSONPlaceholder | `jsonplaceholder/posts` | `jsonplaceholder.typicode.com/posts` |
| JSONPlaceholder | `jsonplaceholder/users` | `jsonplaceholder.typicode.com/users` |

Available as:
- `BUILTIN_URL_RULES` (compiled into `json-semantic.ts`)
- JSON rule files in `src/rules/network/curl-*.json`
- Test fixtures in `src/rules/fixtures/network/curl-*.fixture.json`

## Module Dependency Graph (AgentSkin)

## Key Functions

### `recursive_prune(obj, signals, aliases, depth = 0, maxDepth = 20)`

Walks a JSON object recursively. For each key:
- If key is in `signals` → keep (apply alias if mapped)
- If value is object → recurse
- If value is array → recurse on first element (for homogeneous arrays)
- If maxDepth exceeded → label as `[truncated]`
- If depth is 0 and first key is single-letter → treat as abbreviated API shorthand (preserve all)

### `to_markdown_skin(pruned, aliases, depth = 0)`

Converts pruned JSON to flat Markdown:
- Objects → `key: value` pairs
- Nested → `key.subkey: value` with dot notation
- Arrays → comma-separated
- Non-scalar sub-objects → recursively flatten

### `classify_url(url)`

1. Build regexes from each rule's `match` patterns
2. Calculate score: +1 per `urlIncludes` match, +1 per `urlIncludesAny` match
3. Return highest-scoring rule (or null if none match)

### `skin(data, options)`

Enhanced pipeline. Options:
| Option | Default | Description |
|--------|---------|-------------|
| `signals` | `[]` | Manual signal key list |
| `aliases` | `{}` | Manual alias map |
| `autoClassify` | `true` | Auto-detect URL rules |
| `smallThreshold` | `300` | Bypass for small payloads |
| `stripAnsi` | `true` | Strip ANSI before processing |

Returns: `{ skin, metrics, compaction }`

## ANSI Pattern Reference

| Pattern | Matches | Example |
|---------|---------|---------|
| CSI | `ESC[ <params> <final_byte>` | `ESC[31m` (red text) |
| OSC | `ESC] ... BEL|ST` | `ESC]0;titleBEL` (window title) |
| CSI incomplete | `ESC[ <params>` at EOS | `ESC[32` (broken) |
| OSC incomplete | `ESC] <any>` at EOS | `ESC]0;title` (broken) |
| Single-char | `ESC<0x40-0x5F>` | `ESC@` (null), `ESCD` (IND) |

### MCP Server (AgentSkin backend)

Exposes `skin()`, `classify_url()`, `strip_ansi()` as tools via `backend/mcp.js`. The server:
- Accepts `auto_classify` parameter on `fetch_optimized_data` (default `true`)
- Uses the full `skin()` pipeline (not just `recursive_prune` + `to_markdown_skin` separately)
- Returns compaction metadata as prepended output lines
- Routes via `switch/toolName` instead of `if/else if`

### Rule System

URL rules are defined in `backend/lib/api-skin-rules.js` with the same schema as Tokenjuice rules. `findMatchingRule(url)` auto-classifies URLs against built-in rules. The `skin()` pipeline:
1. Auto-classifies URL if `autoClassify=true` and no explicit signals
2. Prunes with matched rule's signals/aliases
3. Builds `CompactionMetadata` tracking which strategies were applied

## Bash Optimizer Hook (Phase 3c)

**Transparent shell hook that pipes noisy command output through the Tokenjuice reduce pipeline before it reaches the parent process (any AI coding agent or terminal session).**

### Architecture

```
User Command (e.g., `ls -laR`)
        │
        ▼
┌──────────────────────────────────────┐
│  bash-optimizer.sh                   │
│  ─────────────────                   │
│  _tokenjuice_preexec()               │
│  • Captures preexec PID              │
│  • Sets up tmp_out / tmp_err files  │
│  • Stores argv, exit_code, duration  │
└──────────┬───────────────────────────┘
           │
           ▼  tmp_out, tmp_err (disk files)
┌──────────────────────────────────────┐
│  _tokenjuice_run_optimized()         │
│  • Reads tmp_out / tmp_err from disk │
│    via fs.readFileSync in inline JS  │
│  • Assembles JSON input (stdout,     │
│    stderr, exit_code, argv, cwd)     │
│  • Pipes to tokenjuice reduce CLI    │
│  • Caches result with rawChars,      │
│    reducedChars, ratio, classification│
│  • NO_OPTIMIZE=1 env var → bypass   │
└──────────┬───────────────────────────┘
           │
           ▼  Optimized output printed
      Parent process receives reduced output

  Cache: ~/.cache/tokenjuice/*.json
  • Keyed by command + raw content hash
  • Stores stats + classification
  • Auto-evicts (no limit currently)
```

### ARG_MAX Bug (Fixed June 14)

**The problem:** The `_tokenjuice_run_optimized` function originally passed the full command stdout/stderr as `node -e` command-line arguments:

```bash
# BROKEN — content passed as argv
node -e '...payload...' "${argv_json}" "${stdout_str}" "${stderr_str}" ...
```

Linux `ARG_MAX` (~2 MB) silently truncated arguments >~23 KB (the effective limit after shell/env overhead). This caused the optimizer to receive empty `stdout` and return `(no output)` with `rawChars=0`.

**The fix:** The payload builder now passes **file paths** as argv and reads content from disk via `fs.readFileSync`:

```bash
# FIXED — file paths (< 50 bytes each) passed as argv
node -e '...payload using fs.readFileSync...' "${argv_json}" "${tmp_out}" "${tmp_err}" ...
```

```javascript
// Inline JS before:
const out = process.argv[2] || "";

// Inline JS after:
const fs = require("fs");
const out = fs.readFileSync(process.argv[2], "utf8");
```

**Verified reduction ratios (post-fix):**

| Test | Raw | Reduced | Ratio |
|------|-----|---------|-------|
| `cat STATUS.md` (9.3 KB) | 9,188 chars | 1,197 chars | 0.130 |
| `cat *.md` (141 KB) | 136,060 chars | 1,251 chars | 0.009 |
| `ls -laR agentskin/` (3.1 MB) | 3,192,814 chars | 897 chars | **0.00028** |

### Key Files

| File | Role |
|------|------|
| `.agents/hooks/bash-optimizer.sh` | Hook implementation: preexec + optimized runner + caching |
| `scripts/agent-optimizer.mjs` | Node.js optimizer binary (byte-level reduction) |
| `.agents/hooks/README.md` | Hook architecture documentation |
|

## Test Infrastructure

**Tests span two project directories with shared test suites.**

### Project Layout

```
agentskin/                     # Main project (git root)
├── backend/                   # AgentSkin MCP server + skin engine
├── test/                      # Test files
│   ├── core/                  # Core tests (artifacts, reduce, command, etc.)
│   ├── hosts/                 # Host-specific tests (cursor, copilot, codex, etc.)
│   │   └── fixtures/          # Copied fixture JSON files
│   └── ...
└── tokenjuice-extracted/      # Sub-project: extracted Tokenjuice source
    └── tokenjuice-main/
        ├── src/               # Tokenjuice source
        ├── test/              # Tokenjuice test files
        │   ├── core/
        │   ├── hosts/
        │   │   └── fixtures/  # Canonical fixture JSON source
        │   └── ...
        └── vitest.config.ts   # Vitest config (not auto-discovered from agentskin/)
```

### Fixture Resolution

Tokenjuice tests reference fixture files via `resolve("test/hosts/fixtures/...")`. These fixtures exist at `tokenjuice-extracted/tokenjuice-main/test/hosts/fixtures/` but vitest (run from `agentskin/`) doesn't auto-discover configs in subdirectories, so it resolves relative to `agentskin/` — requiring fixture copies in `agentskin/test/hosts/fixtures/`.

### Current Test Health

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| agentskin (via `npx vitest run`) | 141 / 141 | 2,410 / 2,410 | ✅ 100% |
| tokenjuice (via `npx vitest run`) | 133 / 133 | 2,285 / 2,285 | ✅ 100% |
| **Combined** | **274** | **4,695** | **✅ Zero failures** |

### Known Historical Issues (Resolved)

| Issue | Root Cause | Fix |
|-------|------------|-----|
| MCP security: 42 tests failed | `isSafeUrl`, `isHtmlContent`, `htmlToText` defined but never exported + edge-case bugs | Added `export` keyword + boolean cast + regex fix + `undefined` return |
| pi + opencode: 41 tests failed | `esbuild` not installed as dependency | `npm install esbuild` |
| Fixture ENOENT: 3 tests failed | Fixture files in sub-repo, not at vitest root-relative path | Created `agentskin/test/hosts/fixtures/` + copied canonical JSON files |
| cursor path-quoting: 1 test failed | `toContain(resolvedPath + " cmd")` broke when path contained spaces (shell-quoted output) | Split into 3 independent `toContain` assertions (path, subcommand, flag) |
| codex `artifactDir` undef: 1 test failed | `TOKENJUICE_ARTIFACT_DIR` env var never set in test | Set env var to temp dir before extract |
| artifacts `$HOME` path: 1 test failed | Fallback default IS `$HOME/.tokenjuice/artifacts`, test expected no `$HOME` | Wrapped test with env-configured temp dir |
| ARG_MAX: large output truncated | `node -e` received multi-MB argv → silent truncation | file paths as argv, `fs.readFileSync` in inline JS |

## MCP Server Security (AgentSkin v2.0)

### Exports

Three SSRF/HTML utility functions are exported from `backend/mcp.js` for testing:

- **`isSafeUrl(url)`** — Blocks private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, ::, 0.0.0.0, 169.254.x.x). Used by server-side fetch handler and exposed via `classify_url` tool.
- **`isHtmlContent(contentType)`** — Returns `true` for `text/html`, `application/xhtml+xml` (or variants). Handles null/undefined → returns `false`.
- **`htmlToText(html)`** — Parses HTML to extract `{ title, h1, h2, links, meta_description, bodyText }`. Strips data URLs properly (full `data:mediatype,content` → NOT just `,content`). Returns `undefined` for missing title/h1.