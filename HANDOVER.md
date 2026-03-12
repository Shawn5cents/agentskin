# AgentSkin: The OpenRouter for APIs (v2.5)

## 🎯 The North Star
AgentSkin is the **Universal Semantic Layer** between messy human APIs and autonomous AI agents. We solve **Data Fragmentation** by normalizing JSON into high-density "Skins."

## 🚀 Features (v2.5)
1. **Unified Endpoint:** `POST /v1/skin` for Weather, News, Search, and Generic Scraping.
2. **Recursive Shorthand Engine:** Prunes 90% of JSON noise, saving significant "Token Tax."
3. **OpenRouter-Style Economy:** Automatically calculates token savings and applies a **20% platform fee** on net benefits.
4. **Autonomous Billing (L402):** Returns `402 Payment Required` with machine-readable Stripe links when quotas are exceeded.
5. **Supervisor Dashboard:** Real-time SSE monitoring of agent activity and platform revenue (tokens saved).

## 🛠️ Architecture
- **Backend:** Node.js / Express / Zod
- **Discovery:** `llms.txt`, `skill.md`, and the Human Manifesto at `/v1/manifesto`.
- **Connectors:** Open-Meteo, MediaStack, Serper.dev.

## 🔒 Agent-First Policy
- **Root 403:** Humans are directed to the Manifesto; machines get the API.
- **Provenance:** `X-AgentSkin-Provenance` header verifies data source integrity.

---
**Build for the machines. The humans will follow.**
