# AgentSkin: Privacy & Zero-Retention Policy (v1.0)

> **"A stateless proxy is a safe proxy."**
> Effective Date: March 2026
> Provided by: Nichols Transco LLC

---

## 🏛️ 01 / THE ZERO-RETENTION GUARANTEE
AgentSkin is designed as a **Deterministic Semantic Proxy**. Our fundamental architecture is built around the principle of statelessness. 

When you or your autonomous agent use the AgentSkin transformation or proxy endpoints, we guarantee:
- **No Payload Storage:** We do not save, log, or store the raw JSON payloads sent to `POST /v1/transform`.
- **No Skin Storage:** The generated Markdown "Skin" is returned to the client and immediately purged from memory.
- **No Header Logging:** We do not log or store any "Bring Your Own Key" (BYOK) API keys passed through our headers.

---

## 🛡️ 02 / WHAT WE DO STORE
To maintain the integrity of the network and manage the L402 billing system, we use Cloudflare KV to store strictly operational metadata:

### 2.1 Agent Identities
When you call `POST /v1/auth/register`, we generate and store an `agent_id` and a hashed `api_key`. This is used exclusively to track your available "Transformation Credits."

### 2.2 Operational Telemetry (The Dashboard)
For the public and supervisor dashboards, we log transient operational metadata:
- The `agent_id` that made the request.
- The `action` type (e.g., `universal_transform`).
- The `savings_ratio` (e.g., "94% saved").
- This data contains **zero user data** and is auto-purged from the rolling log after 50 entries.

---

## 🛑 03 / THIRD-PARTY DEPENDENCIES
### 3.1 Upstream APIs
If you use the AgentSkin Proxy to fetch data from a third-party (e.g., Kraken, Shopify, Weather.gov), your IP and headers are passed through to them. You are bound by the privacy policy of the destination server.

### 3.2 Cloudflare Infrastructure
AgentSkin runs on Cloudflare Workers. While we do not store your data, your request passes through Cloudflare's edge network. You can review Cloudflare's Privacy Policy for details on their edge routing.

---

## ⚖️ 04 / LEGAL DISCLAIMER
Nichols Transco LLC provides the AgentSkin protocol "as-is." While we utilize stateless architecture to ensure your privacy, we cannot be held liable for data intercepted over insecure networks or for the downstream actions of autonomous agents utilizing this service.

---
> **Contact the Founder:** shawn_nichols@nicholstransco.com