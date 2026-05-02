# AgentSkin: Protocol Maintenance & Secret Vault

This directory serves as the **Public Reference Implementation** for the **Semantic Shorthand Standard (SSS)**.

### 🏛️ Operational Boundaries (The Law)

1.  **Public Standard (This Repository):**
    *   This repository must remain a **Lean Reference Implementation**.
    *   Only the core SSS engine (`skin-engine.js`), the local MCP shell (`mcp.js`), and the protocol documentation are allowed here.
    *   **NO** industry-specific logic (Sylectus, Kraken, etc.) may ever be committed to this branch.

2.  **Secret Vault (`/agentskin-private-vault`):**
    *   This is the **Nested Laboratory**.
    *   All proprietary technology (Stealth Hermes engine, Synthesis logic, specialized connectors) lives here.
    *   This folder is explicitly ignored by Git and whitelisted out of NPM. It is for **Internal Development Only**.

3.  **Deployment Hierarchy:**
    *   **NPM (`agentskin`):** Ships only the open protocol. Whitelisted in `package.json`.
    *   **Cloudflare (`api.agentskin.dev`):** Runs a minimalist mirror of the SSS engine.

---
**Lead Architect:** Shawn Nichols Sr.  
**Vision:** Establish the standard. Secure the intelligence.  
**Status:** **[VAULT_LOCKED]**
