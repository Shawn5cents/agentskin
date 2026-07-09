# AgentSkin Enhancements (Phase 1)

**Tokenjuice patterns ported into AgentSkin's SSS protocol engine.**

## Changes Summary

### 1. New: `text-utils.js` — Grapheme-Aware Text Utilities

Ported from Tokenjuice's `src/core/text.ts`. Provides accurate character counting and ANSI stripping.

**Exports:**
- **`stripAnsi(text)`** — Removes 5 types of ANSI escape sequences: CSI, OSC, incomplete CSI/OSC, and single-char escapes. Handles corner cases (stray ESC bytes).
- **`graphemes(text)`** — Splits text into grapheme clusters using `Intl.Segmenter` (available in Node.js 20+). Falls back to `Array.from()` on older runtimes.
- **`countTextChars(text)`** — Returns grapheme cluster count. More accurate than `.length` for CJK, emoji, and combining marks.
- **`estimateTokens(text)`** — Token estimation using grapheme count (`Math.ceil(chars / 4)`). Used for fee calculation and safety valve decisions.
- **`estimateTokensFast(text)`** — Fast estimation using raw `.length`. Used when grapheme precision isn't needed.
- **`clampText(text, maxChars)`** — Clamps text to max grapheme chars, appending `...` if truncated.
- **`clampTextMiddle(text, maxChars)`** — Clamps from both ends, keeping the middle with `...(N chars)...`.
- **`isBelowSkinThreshold(rawText, maxChars = 300)`** — Checks if text is below processing threshold.

**Why it matters:** Before this, AgentSKin used `length / 4` which can be 30-50% off for non-ASCII text. Now it's grapheme-accurate.

### 2. New: `api-skin-rules.js` — URL-Pattern Auto-Classification

Ported Tokenjuice's rule-driven classification pattern. Replaces manual signal specification with automatic URL-based rule matching.

**Built-in rule families:**
- **`github`**: `repos`, `users`, `issues`, `pulls`, `search` — each with domain-specific signals and aliases
- **`weather`**: `open-meteo` — temperature, precipitation, wind data with weather aliases
- **`hn`**: `items` — HackerNews story fields
- **`jsonplaceholder`**: `posts`, `users` — placeholder API schemas
- **`stripe`**: `charges`, `customers`, `invoices` — payment data
- **`openai`**: `chat`, `models` — AI API responses
- **`reddit`**: `posts` — Reddit thread data

**Scoring system:** Rules with `urlIncludes` + `urlIncludesAny` score higher (more specific). Multiple overlapping rules resolve by highest score.

**3-layer config (✅ shipped — see [THREE-LAYER-RULES.md](./THREE-LAYER-RULES.md)):**
1. **Builtin** — Compiled into `BUILTIN_RULES` (lowest priority)
2. **User** — `$XDG_CONFIG_HOME/agentskin/signals.json` or `~/.config/agentskin/signals.json`
3. **Project** — `<projectRoot>/.agentskin/signals.json` (highest priority)

Override semantics: same-`id` in a higher layer **replaces** the lower-layer rule (no deep-merge); `"disabled": true` in any layer **removes** the matching lower-layer rule; new `id` values are **appended**. Per-`projectRoot` cache in `getAllRules()`. Public API: `loadUserRules`, `loadProjectRules`, `mergeRuleLayers`, `getAllRules`, `clearRuleCache`, `getConfigPaths`.

### 3. Enhanced: `skin-engine.js` v5.0

**Changes to existing module:**
- **Imports added:** `stripAnsi`, `estimateTokens`, `countTextChars`, `isBelowSkinThreshold` from `text-utils.js`; `findMatchingRule` from `api-skin-rules.js`
- **New options in `skin()`:** `autoClassify`, `smallThreshold`, `stripAnsi`
- **Smart passthrough:** When raw data is smaller than `smallThreshold` (default 300 graphemes), returns raw JSON without processing — saves time on tiny payloads
- **Security:** `stripAnsi` option (default `true`) strips ANSI from incoming text data before processing
- **Compaction metadata:** Returns `compaction.kinds` (array of applied strategies) and `authoritative` flag

**New exports:**
- `classify_url(url)` — Classifies a URL against built-in API rules
- `createCompactionMetadata(kinds, authoritative)` — Creates metadata objects
- `mergeCompactionMetadata(...metadatas)` — Merges multiple metadata objects
- `skin(data, options)` — Enhanced pipeline that auto-classifies, prunes, skins, and validates

### 4. Enhanced: `reasoning-skin.js` v2.0

- Now imports `countTextChars`, `estimateTokens`, `estimateTokensFast` from `text-utils.js`
- Metrics use grapheme-accurate counting instead of `.length`
- All existing patterns (hedge, filler, redundant, speculative) preserved

### 5. Enhanced: `mcp.js` — API Rules + Metadata

- Uses `classify_url()` for automatic rule selection when no signals provided
- Enhanced response with `compaction` metadata field
- ANSI stripping applied to incoming text data before processing
- Rewrite prevention: `beforeRedirect` callback checks for URL changes

## File Size Impact

| File | Before | After | Change |
|------|--------|-------|--------|
| `text-utils.js` | — | 3.2 KB | NEW |
| `api-skin-rules.js` | — | 4.8 KB | NEW |
| `skin-engine.js` | ~13 KB | ~14 KB | +1 KB |
| `reasoning-skin.js` | ~5 KB | ~5.2 KB | +0.2 KB |
| `mcp.js` | ~8 KB | ~8.5 KB | +0.5 KB |

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `text-utils.test.js` | 23 | ANSI patterns, grapheme counting, token estimation, clamping, threshold |
| `api-skin-rules.test.js` | 16 | All 8 rule families, scoring, edge cases |
| `skin-engine.test.js` | 13 | Existing regression suite (unchanged) |
| `skin-engine-v5.test.js` | 14 | Auto-classification, metadata, pipeline, safety valve |
| `reasoning-skin.test.js` | 3 | Existing regression suite (unchanged) |
| **Total** | **69** | **All passing** |
