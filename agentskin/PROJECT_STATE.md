# AgentSkin project state

## Version

5.1.0 development line.

## Current architecture

- AgentSkin semantic pruning is implemented in `backend/lib/skin-engine.js`.
- MCP transport and tool routing are in `backend/mcp.js`.
- Tokenjuice 0.8.x is consumed from npm for CLI reduction.
- The package exposes `compress` as the primary compaction entry point while retaining the existing seven tools for compatibility.

## Release evidence

The release gate is `npm test` from the package root. It runs AgentSkin-owned unit, security, MCP, and HTTP integration tests. Vendored upstream source is not part of the release gate.

## 5.1 changes

- Explicit/rule signals no longer inherit generic `id`, `name`, or `url` defaults.
- Added adversarial regression coverage for nested generic-key leakage.
- Replaced generated Tokenjuice runtime paths with the published npm dependency.
- Added `compress` as a safe automatic front door.
- Removed universal savings and stale combined-test-count claims from release messaging.
- Accepted a deterministic Sparse Env core-evaluation consumer at AgentSkin `66e5ddbaf9c730368ff54a98da92b791fa18d065` / Sparse Env `407cf879cddd17ba9c610907817d6753edf35be4`. The frozen core output hash is preserved; measured cold execution selects Stargz (48.22% lower median cold total, 60.02% lower fresh-store growth), while warm is a 739 ms vs 740 ms operational tie and retains overlayfs. See `docs/SPARSE_ENV.md`.
