# AgentSkin usage

## Install / run

```bash
npx -y agentskin@latest
```

Add it to an MCP client with command `npx` and arguments `-y`, `agentskin@latest`.

## Primary tools

### `compress`
Use this first when you already have context to compact. With `mode: auto`, AgentSkin chooses CLI mode when `command` is supplied, JSON mode when the input parses as JSON, and otherwise performs safe text cleanup without rewriting prose.

### `fetch_optimized_data`
Fetches a public HTTP(S) URL. Known structured APIs are classified and pruned using explicit signals. Unknown/small payloads use safety fallbacks instead of forcing compression.

### `reduce`
Compacts terminal output. Supply both `command` and `output`. Tokenjuice provides the command-specific reduction engine.

## Advanced tools

- `apply_json_semantic` — direct JSON pruning
- `classify_url` — inspect the rule selected for a URL
- `strip_ansi` — remove terminal escape codes
- `estimate_tokens` — estimate context size
- `skin_reasoning` — optional prose denoising; use explicitly because it can rewrite wording

## Security limits

Fetches block private/metadata targets, limit redirects and body size, use request rate limiting, validate tool input, and enforce processing timeouts.
