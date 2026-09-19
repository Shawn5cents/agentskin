# AgentSkin architecture

AgentSkin is context middleware between tools and an AI agent.

```text
API / JSON / shell output
          |
          v
      AgentSkin
  classify -> preserve -> reduce
          |
          v
 compact task-relevant context
          |
          v
         LLM
```

## Components

- `agentskin/backend/lib/skin-engine.js` — semantic pruning, URL-rule selection, formatting, metrics.
- `agentskin/backend/lib/api-skin-rules.js` — built-in and layered API signal rules.
- `agentskin/backend/mcp.js` — MCP transport, validation, fetch security, and tool routing.
- `tokenjuice` npm dependency — command-aware terminal reduction used by `reduce` and CLI-mode `compress`.

## Signal semantics

When a caller or URL rule supplies signals, those signals are authoritative. Generic fallback keys are not merged into explicit rules. This prevents unrelated nested objects from surviving merely because they contain common keys such as `id` or `url`.

When no signals exist, AgentSkin can use conservative generic fallback keys.

## Public surface

Primary tools: `compress`, `fetch_optimized_data`, `reduce`.

Compatibility/diagnostic tools: `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, `skin_reasoning`.

## Safety

Network fetching is restricted to public HTTP(S) targets and includes private/metadata host checks, redirect checks, response-size limits, request timeouts, MCP rate limiting, and Zod input validation.
