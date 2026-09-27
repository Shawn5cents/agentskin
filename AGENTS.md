# AgentSkin development guide

AgentSkin is context middleware for AI agents. Keep the product focused on preserving task-relevant information while removing low-value context.

## Product surface

Primary MCP tools: `compress`, `fetch_optimized_data`, `reduce`.

Compatibility/diagnostic tools: `apply_json_semantic`, `classify_url`, `strip_ansi`, `estimate_tokens`, `skin_reasoning`.

## Runtime rules

- Fidelity is the primary metric; token reduction is secondary.
- Explicit signals and URL-rule signals must not inherit generic fallback keys.
- Keep npm and a fresh GitHub clone on the same runtime path.
- Tokenjuice is consumed as an npm dependency; do not vendor its source or generated dist into AgentSkin.
- Do not publish fixed test counts or universal savings claims unless CI generates them from the current release.
- For the accepted Sparse Env core-evaluation path, AgentSkin supplies workload/cache intent only; Sparse Env owns environment/snapshotter selection and lifecycle. See `agentskin/docs/SPARSE_ENV.md`.

## Release gate

```bash
cd agentskin
npm ci
npm test
npm run lint
npm run prepublishOnly
npm pack --dry-run
```
