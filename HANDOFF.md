# AgentSkin: Developer Handoff (v3.4)

> **The Universal Semantic Adapter for Agentic Infrastructure.**
> **Owner:** Nichols Transco LLC // Shawn Nichols Sr.
> **Contact:** shawn_nichols@nicholstransco.com

---

### 🏛️ 01 / SYSTEM OVERVIEW
AgentSkin is a deterministic proxy that prunes redundant "noise" from API responses before they hit an LLM context window. 

**The Stack:**
- **Runtime:** Node.js (ES Modules)
- **Engine:** Recursive Shorthand Engine (Pure JS, No LLM required)
- **Interface:** REST API + MCP (Model Context Protocol)
- **Security:** SHA-256 Proof-of-Work (Optional for Alpha)
- **Billing:** L402 / Stripe (Pre-wired logic)

---

### 🚀 02 / CORE ENDPOINTS

#### 1. Universal Transform (`POST /v1/transform`)
The main entry point for custom data.
```json
{
  "data": { "raw": "json_blob" },
  "signals": ["price", "status"],
  "title": "MY_SKIN"
}
```

#### 2. Universal Proxy (`GET/POST /v1/proxy/<URL>`)
The "Zero-Code" adoption layer. Just prefix any API URL with this path to get a skinned response.

#### 3. Legacy Connectors (`POST /v1/skin`)
Wrappers for `weather`, `news`, and `search`.

---

### 🤖 03 / MCP INTEGRATION (The Agent Skill)
The MCP server is located at `backend/mcp.js`. 
To add to Cursor/Claude:
- **Command:** `node /path/to/backend/mcp.js`
- **Tool provided:** `fetch_optimized_data(url, signals, headers)`

---

### 🛠️ 04 / ENGINE LOGIC (`backend/lib/skin-engine.js`)
The `recursive_prune` function is the proprietary heart of the protocol.
- **Auto-Signal Detection:** Automatically keeps keys like `price`, `id`, `status`, `c`, `v`, `p`.
- **Zero-Inflation Guarantee:** If the skin is not smaller than the raw JSON, it returns the raw JSON.

---

### 🛡️ 05 / INFRASTRUCTURE & SCALING
- **Current State:** Express server running on standard Node.js.
- **Roadmap (v4.0):** Migrate to **Cloudflare Workers**. Use **Cloudflare KV** for persistent agent usage tracking and global caching.
- **Arbitrage Logic:** Always charge `(Upstream Cost) + 20%`. The platform commission is calculated in `skin-engine.js`.

---

### 🏁 06 / MAINTENANCE CHECKLIST
1.  **API Keys:** Ensure `backend/.env` has valid keys for Serper and MediaStack.
2.  **Stripe:** Update `STRIPE_CHECKOUT_URL` in `.env` to your live payment link.
3.  **Logs:** Monitor the Supervisor Dashboard at `/v1/supervisor` for real-time performance metrics.

---

### 🚀 07 / v5.0 ROADMAP - THE PROPRIETARY CONTEXT ENGINE

The long-term mission of Nichols Transco LLC is to move from a **Stateless Proxy** to a **Contextual Intelligence Engine**.

#### 1. The "Composer" Layer (Multi-Source Mapping)
- **Feature:** A proprietary algorithm that merges multiple skins (e.g., Finance + News + Social) into a single, high-density **"Master Skin."**
- **Value:** Reduces agentic cognitive load by pre-linking related signals across different APIs.

#### 2. Semantic Memory (Historical Indexing)
- **Feature:** Store the "History of the Skin" in a persistent vector-standard format.
- **Value:** Allows agents to ask for "Trend Signals" (e.g., "Show me the 7-day average sentiment from these 10 news sources").

#### 3. Enterprise Subscription Model
- **Proxy:** Micro-payments (L402) for high-volume transformation.
- **Engine:** Premium monthly subscription for "Composer" and "Memory" features.

---

> © 2026 NICHOLS TRANSCO LLC // THE FUTURE OF AGENTIC PERCEPTION.
