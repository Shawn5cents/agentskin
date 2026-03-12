# AgentSkin Provenance & Verification Protocol (v2.5)

## 1. Zero-Hallucination Layer
AgentSkin v2.5 utilizes a **Deterministic Semantic Engine**. By using **Zod Schemas** in `engine.js` and **Recursive Pruning** in `skin-engine.js`, we ensure that:
- Every piece of data is validated against a strict type definition.
- **Recursive Shorthand Engine:** We intelligently prune JSON to a "Skin" that maintains 100% data integrity while removing up to 90% of token noise.
- Output formats are strictly Markdown-based, optimized for LLM attention mechanisms.

## 2. Platform Economy (Commission Logic)
AgentSkin follows a transparent, value-based fee structure:
- **Token Valuation:** We estimate the raw token weight of the source data.
- **Savings:** We provide a 90% reduction in token consumption.
- **Platform Fee:** A **20% commission** is applied to the net token savings, supporting the network's infrastructure and development.

## 3. Tool Specs & Connectors
| Tool | Source | Verification |
| :--- | :--- | :--- |
| `weather` | Open-Meteo | Zod (Deterministic) |
| `search` | Serper.dev | Zod (Deterministic) |
| `news` | MediaStack | Zod (Deterministic) |
| `generic` | Custom URL | Recursive Pruning |

## 4. Verification Header
Every response from AgentSkin includes an `X-AgentSkin-Provenance` header containing the raw source URL. Agents can use this to verify data independently if required.
