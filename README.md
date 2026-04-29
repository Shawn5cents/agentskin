# AgentSkin: Semantic Shorthand Standard (SSS)

[![npm version](https://img.shields.io/npm/v/agentskin.svg)](https://npmjs.org/package/agentskin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AgentSkin is an open-source protocol and reference Model Context Protocol (MCP) server that establishes the **Semantic Shorthand Standard (SSS)** for Agentic Perception. 

The protocol defines a standardized method for recursively pruning high-entropy, human-readable data (HTML, bloated JSON, complex APIs) into low-entropy, deterministic Markdown "Skins." This significantly reduces LLM token consumption (the "Token Tax") and eliminates perceptual drag in autonomous reasoning loops.

## The Protocol

The core of AgentSkin is the recursive pruning engine. It operates on a simple, declarative standard:
1. **Audit:** Intercept raw data payloads.
2. **Signal Mapping:** Define an array of required, high-density keys.
3. **Semantic Pivot:** Apply an alias map to standardize inconsistent API schemas into a unified namespace.
4. **Flatten:** Output a deterministic, hierarchical Markdown string.

### Reference Implementation

This repository provides the official Node.js reference implementation of the SSS protocol, exposed as a standard MCP server.

## Quickstart (MCP Server)

You can run the AgentSkin reference server directly via `npx` to provide your local AI assistants (Claude Desktop, Cursor, etc.) with the `fetch_optimized_data` tool.

```bash
npx -y agentskin@latest
```

### Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

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

## Tools

The reference implementation exposes the following tools to AI agents:

### 1. `fetch_optimized_data`
Fetches any API or Web URL and returns a 90% token-optimized "Skin." 
- **Arguments:**
  - `url` (string, required): The target data source.
  - `signals` (string[], optional): An array of semantic keys to preserve.
  - `aliases` (object, optional): A map to rename original keys to standardized signals.

### 2. `skin_reasoning`
Optimizes natural language text by removing linguistic noise (hedging, filler).
- **Arguments:**
  - `text` (string, required): The natural language string to distill.

## Creating a Skin

AgentSkin is a factory for intelligent perception. You provide the mapping; the protocol provides the engine.

When using the `fetch_optimized_data` tool, provide the `signals` and `aliases` parameters to build your own skin.

**Example: Weather API Skin**
```json
{
  "url": "https://api.weather.gov/gridpoints/TOP/31,80/forecast",
  "signals": ["temperature", "windspeed", "shortforecast"],
  "aliases": {
    "temperature": "temp",
    "shortforecast": "forecast"
  }
}
```

## Architecture

This package is designed as a **Local-First, Open Studio**.
- All data fetching and pruning happens locally on the host machine.
- User session state, cookies, and network access remain strictly local and private.
- The core engine (`skin-engine.js`) operates without external dependencies for transformation.

## Security

The reference implementation includes robust security measures:
- **SSRF Protection:** Private network ranges (IPv4/IPv6) are blocked
- **Input Validation:** All tool inputs validated with Zod schemas
- **URL Sanitization:** Dangerous URL schemes (javascript:, data:) stripped from HTML links
- **Processing Timeout:** 30s limit prevents resource exhaustion

## Testing

```bash
npm test        # Run all 48 tests
npm run lint   # Lint code quality
npm run benchmark  # Run token compression benchmarks
```

## Specification & Benchmarks

- [Formal Specification](docs/SPECIFICATION.md)
- [FAQ with Benchmarks](docs/FAQ.md)
- [Local Benchmarks](benchmarks/run.js) `npm run benchmark`

Online docs: [agentskin.dev](https://agentskin.dev)

---
*Maintained by Nichols Transco LLC. Built for the machine economy.*
