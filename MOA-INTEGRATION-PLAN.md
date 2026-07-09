> **ARCHIVED — June 2026**  
> This document describes the original MOA-specific integration plan. The engines (AgentSkin and Tokenjuice) are fully decoupled from MOA and work with any MCP-aware agent (Claude Code, Cursor, Copilot Chat, Continue, etc.). This doc is kept for historical reference only.

# MOA Integration Plan (Phase 3)

**How to integrate AgentSkin + Tokenjuice into the MOA coding agent.**

## Overview

MOA currently has:
- MCP server support (`.agents/mcp.json`)
- Composio tool integration
- Spawnable agents with tool access
- LLM context management

The plan is to make AgentSkin and Tokenjuice available to MOA agents as tools that can be called during coding tasks.

## Option A: MCP Server (Quickest)

Add AgentSkin's and Tokenjuice's MCP servers to MOA's MCP configuration:

**`.agents/mcp.json`** (see the file for the full, current schema):
```json
{
  "mcpServers": {
    "agentskin-mcp": {
      "command": "bash",
      "args": [".agents/mcp/agentskin-mcp.sh"]
    },
    "tokenjuice-mcp": {
      "command": "bash",
      "args": [".agents/mcp/tokenjuice-mcp.sh"]
    }
  }
}
```

This exposes **all 9 tools** (4 from `agentskin-mcp` + 5 from `tokenjuice-mcp` — see [Verified Tool Inventory](#verified-tool-inventory) below) to all MOA agents immediately. No code changes needed in MOA.

**Pros:** Zero code changes, works today, leverages existing MCP infrastructure.
**Cons:** MCP calls add ~50-100ms overhead; limited to StdioServerTransport.

## Option B: Composio Tool (Native Integration)

Create a Composio tool definition that wraps AgentSkin:

```typescript
// agents/agentskin/index.ts
import { skin, skinReasoning } from '../../agentskin/backend/lib/skin-engine.js'

export const agentskinTool = {
  name: 'skin_api_response',
  description: 'Optimize an API JSON response using AgentSkin SSS',
  parameters: {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'JSON response data' },
      url: { type: 'string', description: 'Original URL for auto-classification' },
      signals: { type: 'array', items: { type: 'string' } },
    },
  },
  handler: async ({ data, url, signals }) => {
    return skin(data, { url, signals })
  },
}
```

**Pros:** No MCP overhead; fully typed; can be imported directly; can be used in composio-based agent workflows.
**Cons:** Requires adding the agentskin repo as a dependency of the MOA SDK.

## Option C: Bash Hook (Context-Aware)

Instrument MOA's terminal command execution to pipe output through AgentSkin/Tokenjuice automatically:

```typescript
// In MOA's bash tool handler:
if (options.optimizeOutput && result.stdout.length > 500) {
  const optimized = await skin(result.stdout, {
    smallThreshold: 500,
    stripAnsi: true,
  })
  result.optimizedStdout = optimized.skin
}
```

This would make optimization transparent — every `curl`, `git status`, or `npm test` output automatically gets compressed before entering context.

**Pros:** Transparent; no agent changes needed; biggest context impact.
**Cons:** More invasive code change; could lose data if safety valve fails.

## Recommendation: All Three, Phased

| Phase | What | When |
|-------|------|------|
| 3a | MCP config (Option A) | Immediate — 5 min setup |
| 3b | Composio tool + MOA agent config (Option B) | Next session |
| 3c | Bash hook instrumentation (Option C) | After validation |

## Verified Tool Inventory

Verified by sending a `tools/list` JSON-RPC request to each running MCP server (post-`initialize` + `notifications/initialized` handshake). See [STATUS.md § Verified MCP Tool Inventory](./STATUS.md#verified-mcp-tool-inventory) for full per-tool parameter schemas.

### `agentskin-mcp` — 4 tools

| Tool | Purpose |
|------|---------|
| `fetch_optimized_data` | Fetch any API/Web URL and return a token-optimized Skin (up to 88% reduction) |
| `skin_reasoning` | Optimize natural language text (14–29% reduction) |
| `classify_url` | Match a URL against built-in API skin rules |
| `strip_ansi` | Strip ANSI escape codes from text |

### `tokenjuice-mcp` — 5 tools

| Tool | Purpose |
|------|---------|
| `apply_json_semantic` | Prune a JSON string via signal keys (AgentSkin-style), up to 88% reduction |
| `classify_url` | Match a URL against built-in API skin rules |
| `strip_ansi` | Strip ANSI escape codes from terminal output |
| `estimate_tokens` | Grapheme-aware token count estimation (÷ 4) |
| `reduce` | Full Tokenjuice reduction pipeline on command output |

> **Note on overlap:** `classify_url` and `strip_ansi` appear in both servers because both wrappers expose a small subset of the same underlying utilities. They are independent implementations registered on different MCP daemons — call whichever the routing layer prefers.

## Expected Impact

| Metric | Before | After (est.) |
|--------|--------|-------------|
| API call tokens avg | 500 tok | 100 tok |
| Terminal output tokens avg | 300 tok | 120 tok |
| Agent cycle API calls | 5-10 | 5-10 (same) |
| Agent cycle terminal commands | 3-5 | 3-5 (same) |
| **Total tokens reclaimed/cycle** | — | **2,000–4,000 tok** |

At $0.50/M tokens, that's ~$0.001–$0.002 saved per cycle. More importantly, it means agents can complete complex tasks in 40-50% fewer turns.
