# AgentSkin (v3.5) 🛡️

> **The Universal Semantic Layer for high-density Agentic Perception.**
> A Model Context Protocol (MCP) Server for real-time Token Optimization.

---

### 📊 THE BENCHMARKS (Verified v3.5)
- **Weather.gov (Complex JSON):** **72.86% Token Reduction**
- **NBA Live Scoreboard:** **90%+ Token Reduction**
- **Agent Reasoning:** **34% Semantic Noise Reduction** (via `Reasoning Skin v1.0`)

---

### 🏛️ 01 / HOW IT WORKS

AgentSkin operates in two primary modes to fit any agentic workflow:

#### A. The Local MCP Server (Privacy-First)
Run AgentSkin locally to optimize your own development context.
- **Setup:** `node backend/mcp.js`
- **Security:** Your private API keys (Google, Brave, etc.) stay in your local `.env`. 
- **Benefit:** 70%+ token savings on your local Claude/Cursor/GPT-4 usage.

#### B. The Managed API (Scale-First)
Integrate AgentSkin directly into your AI applications via the Cloudflare Edge.
- **Endpoint:** `POST https://api.agentskin.dev/v1/transform`
- **BYOK (Bring Your Own Key):** Pass your private API headers in the request; AgentSkin skins the response on the fly.
- **Benefit:** Infinite scale and zero-latency data normalization for production agent fleets.

---

### 🚀 02 / QUICK START (MCP)
To give your agent this skill, add it to your `mcp_settings.json`:

```json
{
  "mjs-server-agentskin": {
    "command": "node",
    "args": ["/path/to/agentskin/backend/mcp.js"]
  }
}
```

---

### 🛠️ 03 / CORE PROTOCOLS
1.  **Recursive Shorthand Engine:** Prunes JSON "noise" based on semantic signal keys.
2.  **Reasoning Skin (v1.0):** Strips linguistic fillers, hedges, and conversational overhead from LLM-to-LLM streams.
3.  **L402 Economy:** Built-in support for autonomous micro-payments and provenance verification.

---

### 🛡️ PRIVACY & PROVENANCE
- **Local-First:** All transformations occur in-memory on your local instance.
- **Zero Retention:** We never store or transmit your raw API data.
- **Verification:** Every packet includes an `X-AgentSkin-Provenance` header for source integrity.

---

### 💰 ABOUT THE CREATOR
AgentSkin was built by **Shawn Nichols Sr.** (@Shawn5cents) at **Nichols Transco LLC**. 
It is the result of 3 years of 18-hour-a-day obsession with the CLI and Agentic Infrastructure.

**We are building the bridge for the machines. The humans will follow.**

© 2026 NICHOLS TRANSCO LLC // [SYSTEM_OPERATIONAL]
