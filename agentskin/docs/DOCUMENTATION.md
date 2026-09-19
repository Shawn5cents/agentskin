# AgentSkin 5.1 documentation

AgentSkin is context middleware for AI agents. Its primary MCP workflows are `compress`, `fetch_optimized_data`, and `reduce`. Compatibility tools remain available for direct semantic pruning and diagnostics.

Explicit signals are authoritative. Generic fallback keys are used only when no explicit signal set exists.

Run the release gate with `npm test`, `npm run lint`, and `npm audit --omit=dev --audit-level=high`.
