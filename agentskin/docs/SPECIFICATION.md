# AgentSkin 5.1 specification

1. Explicit signals and URL-rule signals are authoritative.
2. Generic fallback keys apply only when no explicit signals exist.
3. Small or already-compact payloads may pass through unchanged.
4. Network fetches are limited to public HTTP(S) targets and protected by validation, size limits, timeouts, and redirect checks.
5. Compression metrics describe the observed transformation; they are not a fidelity score.
