# AgentSkin: Protocol State

## Current Version: 4.2.2 (Reference Implementation)
**Date:** March 2026

---

## 🏛️ Core Architecture: Semantic Shorthand Standard (SSS)
AgentSkin is an open-source protocol and reference Model Context Protocol (MCP) server. It is designed to solve the "Token Tax" problem by defining a standardized method for recursively pruning high-entropy, human-readable data into low-entropy, deterministic Markdown "Skins."

### 🔌 The Reference Client (NPM: `agentskin`)
- **Type:** Local-First MCP Server & Core Pruning Engine.
- **Role:** Allows AI assistants (Claude, Cursor) to autonomously fetch and prune external data using user-defined schemas.
- **Tools Exposed:**
  - `fetch_optimized_data`: Accepts a URL, an array of required keys (`signals`), and an alias map (`aliases`) to prune JSON/HTML into a clean "Skin."
  - `skin_reasoning`: A natural language text optimizer that strips linguistic noise.

### 🌐 The Protocol Website (`agentskin.dev`)
- **Role:** The official registry and documentation for the SSS standard.
- **Stack:** Hono (Node.js), deployed via Cloudflare Workers.
- **Routes:** 
  - `/`: Introduction & Setup.
  - `/specification`: The 4-step protocol definition.
  - `/examples`: Reference templates.
  - `/whitepaper`: Academic specification.

---

## 🛡️ Proprietary Separation 
*Maintainer Note:* The AgentSkin protocol is fully open-source. All advanced, proprietary, or industry-specific logic (e.g., enterprise load-board scrapers, custom search synthesis logic) must remain strictly decoupled from this repository and must not be distributed via the public NPM package. The `agentskin` package must only ever serve as the foundational, agnostic protocol layer.
