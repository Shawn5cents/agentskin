# Three-Layer Rule Config

**Override-aware rule resolution for AgentSkin's URL auto-classifier.**

## Overview

`api-skin-rules.js` ships with ~11 built-in URL rules (GitHub repos/users/issues/pulls/search, weather/open-meteo, hackernews/item, npm/registry, jsonplaceholder/posts/users, reddit/post). The 3-layer config lets you override, disable, or extend those builtins from a per-user file and a per-project file — without forking the library.

The resolver has three layers. **Highest priority wins**, but each layer interacts with the others through a small set of well-defined semantics (replace / disable / append).

| Priority | Layer | Path | Use case |
|---------:|:------|:-----|:---------|
| 1 (highest) | Project | `<projectRoot>/.agentskin/signals.json` | Repo-specific overrides (signals, aliases, disable a builtin, add a private API) |
| 2 | User | `$XDG_CONFIG_HOME/agentskin/signals.json` *or* `~/.config/agentskin/signals.json` | Personal preferences across all projects |
| 3 (lowest) | Builtin | Compiled into `BUILTIN_RULES` | Defaults — always available, no setup required |

## File Format

Both user and project files use the same shape:

```json
{
  "rules": [
    {
      "id": "github/repos",
      "family": "github",
      "description": "GitHub repository API responses (overridden)",
      "match": { "urlIncludes": ["api.github.com/repos/"] },
      "signals": ["name", "full_name", "description", "stargazers_count", "language"],
      "aliases": { "stargazers_count": "stars", "full_name": "repo" },
      "transforms": { "stripNull": true },
      "priority": 100
    },
    {
      "id": "internal/jira",
      "family": "internal",
      "description": "Internal Jira issue responses",
      "match": { "urlIncludes": ["jira.acme.internal"] },
      "signals": ["key", "summary", "status", "assignee", "priority"],
      "aliases": { "key": "id" }
    },
    {
      "id": "weather/open-meteo",
      "disabled": true
    }
  ]
}
```

The only required field is `id`. A `match` clause is required for active rules but **not for disable directives** (`{ "id": "...", "disabled": true }`).

### `$schema` for editor autocomplete

Add a `$schema` key pointing at [`agentskin/signals.schema.json`](./agentskin/signals.schema.json) (or your local copy) so editors like VS Code autocomplete rule fields, flag typos, and surface hover docs. The schema is a standard JSON Schema draft-07 document and lives at the agentskin package root.

For a project-layer config at `<projectRoot>/.agentskin/signals.json`, the schema is at `<projectRoot>/agentskin/signals.schema.json`. The relative path from the config to the schema is one level up, then into `agentskin/`:

```json
{
  "$schema": "../agentskin/signals.schema.json",
  "rules": [ ... ]
}
```

For a user-layer config at `~/.config/agentskin/signals.json`, copy or symlink the schema into the same directory and use `$schema: "./signals.schema.json"`. Adjust the `$schema` value to wherever you place the file.

## Override Semantics

For every rule in a higher layer, exactly one of three things happens to the matching lower-layer rule:

| Higher-layer shape | Effect on lower-layer rule with the same `id` |
|:-------------------|:----------------------------------------------|
| Has `match` + `signals` | **Replaces** the lower-layer rule entirely (no deep-merge — fields are not blended) |
| Has `"disabled": true` | **Removes** the lower-layer rule from the final set |
| Has a new `id` not in any lower layer | **Appended** to the end of the final set |

**Important: same-id rules in user and project do not deep-merge.** The project's version wins outright. If you want to *extend* a builtin's signals, copy the full signals list in the project file.

### Disable cascade

A disable directive in any layer removes the rule, even if another layer has a non-disabled override for the same id. Example: if the user layer has an override of `github/repos` and the project layer has `{id: "github/repos", disabled: true}`, the rule is gone — the user's override is also dropped.

This is the safe semantic: a `disabled: true` in the most specific layer always wins, and stale overrides are not silently resurrected.

## Public API

| Export | Signature | Purpose |
|:-------|:----------|:--------|
| `findMatchingRule(url, opts)` | `(url, { projectRoot?, useLayeredConfig=true })` | High-score match across the effective rule set. Set `useLayeredConfig: false` to bypass user/project layers and use only builtins. |
| `loadUserRules()` | `()` | Read & validate the user config file. Returns `[]` for missing/invalid files. |
| `loadProjectRules(projectRoot?)` | `(projectRoot)` | Read & validate the project config file. Defaults to `process.cwd()`. |
| `mergeRuleLayers({ projectRoot? })` | `({ projectRoot })` | Pure function that combines all three layers and returns the effective array. Does not cache. |
| `getAllRules({ projectRoot? })` | `({ projectRoot })` | Cached version of `mergeRuleLayers`. Cache key is the absolute resolved `projectRoot` (or `__default__`). |
| `clearRuleCache()` | `()` | Wipe the rule cache. Use in tests or after writing new config files. |
| `getConfigPaths({ projectRoot? })` | `({ projectRoot })` | Return the resolved file paths for the user and project layers. Useful for `agentskin config --show`. |
| `getBuiltinRules()` | `()` | Shallow copy of `BUILTIN_RULES`. |
| `getRulesByFamily(family)` | `(family)` | Filter builtins by family. |
| `getFamilies()` | `()` | Distinct family names from builtins. |

### Resolution paths

- **User:** `$XDG_CONFIG_HOME/agentskin/signals.json` if `XDG_CONFIG_HOME` is set and non-empty, else `$HOME/.config/agentskin/signals.json` (via `os.homedir()`).
- **Project:** `path.resolve(projectRoot) + '/.agentskin/signals.json'`. Returned as `null` from `getConfigPaths` when `projectRoot` is not provided.

## Caching

`getAllRules` caches the merged result in a module-scoped `_ruleCache` keyed by the absolute resolved `projectRoot` (or the literal string `'__default__'`). The cache is shared across the process — there is no per-import isolation.

Why the cache:
- `findMatchingRule` is called on every API response in the hot path.
- The rule files are read from disk only when the cache misses.
- A cache key tied to `projectRoot` means a long-running process that handles multiple projects (e.g. an MCP server routing by cwd) gets correct per-project rules.

How to clear the cache:
- Call `clearRuleCache()` from app code.
- For tests: `beforeEach(() => clearRuleCache())` is the standard pattern.

Cache invalidation is *not* automatic. If your app writes a new config file at runtime, you must clear the cache.

## Error Handling

`loadUserRules` and `loadProjectRules` never throw. The following conditions all return `[]`:

- File does not exist
- File is not readable (permission denied, etc.)
- File is not valid JSON
- Top-level object has no `rules` array
- Individual rule entries fail validation (missing `id`, neither `match` nor `disabled: true`)

The reasoning: a missing config file is the normal case (most users never create one). Throwing would force every call site to wrap in `try/catch` for the common path. Errors are intentionally silent — diagnostics live in test output, not in the production hot path.

## End-to-End Example

Given:

**`~/.config/agentskin/signals.json`**
```json
{ "rules": [
  { "id": "github/repos", "signals": ["name", "full_name", "description", "stargazers_count"] }
] }
```

**`<my-project>/.agentskin/signals.json`**
```json
{ "rules": [
  { "id": "github/repos", "disabled": true },
  { "id": "internal/jira", "match": { "urlIncludes": ["jira.acme.internal"] },
    "signals": ["key", "summary", "status"] }
] }
```

Effective rule set (highest priority first):

1. **`github/repos`** — disabled by project → **gone**
2. **`internal/jira`** — new from project → **appended**
3. All other 10 builtins (`github/users`, `github/issues`, `github/pulls`, `github/search`, `weather/open-meteo`, `hackernews/item`, `npm/registry`, `jsonplaceholder/posts`, `jsonplaceholder/users`, `reddit/post`) — unchanged

The user's non-disabled override of `github/repos` is silently dropped because the project layer disabled it — this is the disable cascade described above.

## Integration Points

| Caller | Layered? | ProjectRoot source |
|:-------|:---------|:-------------------|
| `skin-engine.js` (`skin()`) | ✅ Yes — via `findMatchingRule` | `opts.projectRoot` (caller-provided) |
| `backend/mcp.js` | ✅ Yes | `opts.projectRoot` passed through from the MCP `skin_api_response` tool args |
| `findMatchingRule(url, { useLayeredConfig: false })` | ❌ No — builtins only | n/a |

When `useLayeredConfig: true` (the default), every match goes through `getAllRules` and therefore through `mergeRuleLayers`.

## Tests

| File | Tests | Coverage |
|:-----|:------|:---------|
| `agentskin/tests/three-layer-rules.test.js` | 18 | `getConfigPaths` (HOME + XDG + projectRoot), `loadUserRules`/`loadProjectRules` (missing file, valid JSON, invalid JSON, malformed entries), `mergeRuleLayers` (5 override/disable scenarios + append), `getAllRules` caching (cache hit, cache miss, clear), `findMatchingRule` integration |

All 18 tests pass. The full AgentSkin suite is green for the 3 files that touch this code path (52 tests across `three-layer-rules.test.js`, `api-skin-rules.test.js`, `skin-engine.test.js`).

## Why no deep-merge?

We considered deep-merging signal arrays from layers (e.g. project signals appended to builtin signals), but rejected it:

- **Predictability.** A "replace" semantic is easier to reason about: what you write is what you get.
- **No silent surprises.** A project file that *removes* a signal can do so by replacing the whole array; deep-merging would force it to mutate the parent's list.
- **Cheaper to validate.** A merged rule is always whole, never half-inherited.
- **Matches mental model of CSS / ESLint.** Override-by-replacement is the standard pattern in tooling that already lets users extend defaults.

If deep-merge is needed in the future, an `extends: true` flag on the rule could opt in. The current "replace" semantic is the safer default.

## Future Work

- `agentskin config --show` CLI command that prints `getConfigPaths()` and counts rules per layer
- File watcher that calls `clearRuleCache()` when `signals.json` changes
- `extends: true` opt-in for deep-merging signal/alias arrays
- Schema validation against `agentskin-signals.schema.json` with helpful error messages
