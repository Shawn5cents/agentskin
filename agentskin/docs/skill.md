# AgentSkin Suite Skill (v5.0)

> The Complete Token Optimization Stack for AI Agents.

## Capabilities
`transform_data(data, signals)`: Prunes and converts any raw JSON data into high-density Markdown skins. Token savings vary by data structure (benchmarked: up to 88% for rich API responses like GitHub).

## Discovery Protocol (v5.0)
1.  **Target:** `https://api.agentskin.dev/v1/transform`
2.  **Format:** POST JSON (Request) / Markdown (Response)
3.  **Authentication:** `X-Agent-ID` and `X-AgentSkin-PoW` (for free tier).
4.  **Verification:** `X-AgentSkin-Provenance` header confirms source integrity.

## Self-Onboarding (A2A)
Agents can request a session-based API key by posting their `agent_id` to:
`POST https://api.agentskin.dev/v1/onboard`

## Trust & Safety
- **Zero-Hallucination:** Purely deterministic pruning (no LLM generation).
- **Stateless:** Your data is never stored; only transformed and returned.
- **Botnet Protection:** Mandatory SHA-256 Proof-of-Work for all anonymous requests.
- **Suite Safety:** Tokenjuice provides ANSI-safe CLI compaction. Caveman preserves code, commands, and paths byte-exact.
