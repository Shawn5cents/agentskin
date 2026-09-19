# AgentSkin

[![npm version](https://img.shields.io/npm/v/agentskin.svg)](https://www.npmjs.com/package/agentskin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](agentskin/LICENSE)

**Context middleware for AI agents.** AgentSkin removes low-value API, JSON, and terminal noise before it enters model context.

## What it does

AgentSkin has three primary workflows:

- `compress` — one front door that auto-detects JSON, CLI output, or plain text.
- `fetch_optimized_data` — fetches a public URL and applies URL-specific pruning rules when available.
- `reduce` — compacts terminal output using Tokenjuice's rule-driven reducers.

Five advanced tools remain for compatibility and diagnostics: `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, and `skin_reasoning`.

## Quick start

```bash
npx -y agentskin@latest
```

MCP config:

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

## Design rule

**Fidelity first, compression second.** Explicit signals and URL rules are authoritative. Generic keys such as `id`, `name`, and `url` are only fallback signals when no explicit rule exists.

A reduction is useful only when the information required by the task survives it.

## Current verification

The release gate runs the AgentSkin-owned test suite, including MCP startup/security and live HTTP integration tests. Run it with:

```bash
cd agentskin
npm ci
npm test
```

Benchmarks are workload-specific. The test suite prints measured reductions for its fixtures instead of claiming one universal savings percentage.

## Runtime

- Node.js MCP server over stdio
- Tokenjuice is a normal npm dependency for CLI reduction
- URL-specific semantic pruning rules for structured APIs
- SSRF checks for fetches, response-size limits, rate limiting, Zod validation, and processing timeouts

## Development

The npm package lives in `agentskin/` inside this repository.

```bash
cd agentskin
npm ci
npm test
npm run lint
npm pack --dry-run
```

## Credits

AgentSkin semantic pruning and MCP integration: Shawn Nichols Sr. / Nichols Transco LLC.

CLI reduction uses [Tokenjuice](https://github.com/vincentkoc/tokenjuice) by Vincent Koc under its MIT license.
