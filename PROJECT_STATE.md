# AgentSkin: Protocol State

## Current Version: 4.2.2 (Reference Implementation)
**Date:** May 2026

---

## 🏛️ Core Architecture: Semantic Shorthand Standard (SSS)
AgentSkin is an open-source protocol and reference Model Context Protocol (MCP) server. It is designed to solve the "Token Tax" problem by defining a standardized method for recursively pruning high-entropy, human-readable data into low-entropy, deterministic Markdown "Skins."

### Token Savings (Benchmarked)
- GitHub API (rich data with avatar_url, bio): **85.9%**
- Weather API (Open-Meteo): **66.3%**
- JSONPlaceholder (simple structure): **4-9%**

Token savings vary by data structure complexity and signal specificity.

### Security Features (v4.2.2+)
- **SSRF Protection:** All IPv4 private ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, 0.0.0.0)
- **IPv6 Blocking:** Link-local, loopback, and IPv4-mapped addresses
- **Cloud Metadata Blocking:** metadata.google.internal, metadata.azure.com, kubernetes.default.svc
- **Rate Limiting:** 30 requests/minute sliding window
- **Input Validation:** Zod schemas for all tool inputs

### Testing
- **77 tests** covering:
  - Core skinning engine (13 tests)
  - Reasoning skin (3 tests)
  - Security/SSRF (33 tests)
  - MCP server integration (14 tests)
  - Real HTTP integration (14 tests)

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
