# AgentSkin (v4.0.3) 🛡️

> **The Universal Semantic Layer for high-density Agentic Perception.**
> A Model Context Protocol (MCP) Server for real-time Token Optimization.

---

### 📊 THE BENCHMARKS (Verified v4.3)
- **Brave Search (AI News):** **67.91% Token Reduction**
- **Severe Weather (NWS):** **71.94% Token Reduction**
- **MediaStack (Global News):** **90.62% Token Reduction**
- **Exa Neural Search:** **PASS-THRU** (Already Optimized)
- **Tavily:** **PASS-THRU** (Integrity Mode - Already Optimized)

> "We don't guess. We prune. If we can't save you at least 20%, we step out of the way."

---

### 🏛️ 01 / REGISTRY & INSTALLATION
AgentSkin is an official MCP server. Install it directly via your favorite registry:

- **NPM:** [View on npm](https://www.npmjs.com/package/agentskin)
- **Smithery:** [View on Smithery](https://smithery.ai/mcp/agentskin)
- **Direct NPX:**
  ```bash
  npx -y agentskin@latest
  ```

---

### 🏛️ 02 / HOW IT WORKS

AgentSkin operates in two primary modes to fit any agentic workflow:

#### A. The Local MCP Server (Privacy-First)
Run AgentSkin locally to optimize your own development context.
- **Setup:** `npx -y agentskin@latest`
- **Security:** Version 4.0.2+ includes SSRF hardening and request timeouts. Your private API keys (Google, Brave, etc.) stay in your local `.env`. 
- **Benefit:** 70%+ token savings on your local Claude/Cursor/GPT-4 usage.

#### B. The Managed API (Scale-First)
Integrate AgentSkin directly into your AI applications via the Cloudflare Edge.
- **Endpoint:** `POST https://api.agentskin.dev/v1/transform`
- **BYOK (Bring Your Own Key):** Pass your private API headers in the request; AgentSkin skins the response on the fly.

#### C. Universal Integration (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek)
Works with any LLM provider or open-weight model. Simply prune before you prompt:
```javascript
// 1. Prune
const { skin } = await fetch('https://api.agentskin.dev/v1/transform', {
  method: 'POST',
  body: JSON.stringify({ data: rawApiData })
}).then(res => res.json());

// 2. Feed to OpenAI/Google/Claude
const response = await openai.chat.completions.create({
  messages: [{ role: "user", content: skin }]
});
```

---

### 🚀 03 / QUICK START (MCP)
To give your agent this skill, add it to your `mcp_settings.json`:

```json
{
  "mjs-server-agentskin": {
    "command": "npx",
    "args": ["-y", "agentskin@latest"]
  }
}
```

---

### 🤖 04 / AUTONOMOUS EVOLUTION
AgentSkin is the first protocol to be co-developed by machines. In March 2026, an autonomous agent named **SPAWN** (powered by Minimax-m2.5) analyzed the AgentSkin codebase and identified a perceptual gap. 

Without human intervention, SPAWN authored the `Reasoning Skin`—a semantic compression layer that strips 34% of linguistic noise from agent-to-agent reasoning streams.

---

### 🛠️ 05 / CORE PROTOCOLS
1.  **Recursive Shorthand Engine:** Prunes JSON "noise" based on semantic signal keys.
2.  **Reasoning Skin (v1.0):** Strips linguistic fillers, hedges, and conversational overhead.
3.  **L402 & Agent Wallets (v5.0 Roadmap):** 
    *   **The Vision:** Built-in support for autonomous micro-payments and direct crypto-economic settlement (as adopted by Polymarket).
    *   **Goal:** Enable a machine-to-machine economy where agents manage their own bankrolls and autonomously purchase token-savings credits via L402 (Lightning) or dedicated Agent Wallets.
    *   **Status:** Currently inactive. All local MCP usage is **100% Free**.

---

### 💰 ABOUT THE CREATOR
AgentSkin was built by **Shawn Nichols Sr.** (@Shawn5cents) at **Nichols Transco LLC**. 

I spent my career in high-pressure Logistics management, running 24/7 terminals for global supply chains. I am a systems-first leader who thrives in high-stakes environments. I build software the same way I run fleets: with a zero-failure mindset.

AgentSkin is the result of deep technical obsession. I built the bridge for the machines because I know what it's like to manage infrastructure that the world depends on.

**We are building the bridge for the machines. The humans will follow.**

© 2026 NICHOLS TRANSCO LLC // [SYSTEM_OPERATIONAL]
