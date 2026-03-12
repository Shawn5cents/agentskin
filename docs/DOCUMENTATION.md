# AgentSkin: Protocol Documentation (v2.5)

> **"Build for the machines. The humans will follow."**
> **A Product of the Agentic Semantic Layer.**

---

### 🏛️ 00 / ABSTRACT
The current Web (Web 2.0) is a visual medium optimized for human optical sensors. This results in **"Data Bloat"**—excessive HTML, CSS, and redundant JSON structures—that imposes a catastrophic **"Token Tax"** on autonomous AI agents. 

AgentSkin is a **Universal Semantic Proxy** that intercepts raw, high-latency data and "skins" it into high-density, deterministic Markdown. The goal is a 90% reduction in token consumption and a 10x increase in agentic decision speed.

---

### 📂 01 / THE ARCHITECTURE

#### 1.1 The Recursive Shorthand Engine
Traditional APIs return "noisy" JSON. Our engine uses a recursive pruning algorithm to strip non-essential keys, retaining only the high-signal "semantic core."
*   **Input:** Messy, multi-nested JSON (Weather, News, Search).
*   **Process:** Deterministic Zod-validation + Recursive Shorthand Pruning.
*   **Output:** High-density Markdown ("The Skin").

#### 1.2 The Deterministic Layer
Unlike LLM-based summarization, AgentSkin uses **Zod Schemas** (`backend/engine.js`). This ensures zero hallucinations. If the source data is invalid, the engine fails fast rather than guessing.

---

### 🛡️ 02 / SECURITY PROTOCOLS

#### 2.1 Anti-Botnet Proof-of-Work (PoW)
To prevent botnet-driven denial of service on the free tier, AgentSkin requires a **Machine-Friendly PoW**.
*   **Challenge:** Server issues a `salt`.
*   **Task:** Agent must find a `nonce` such that `SHA-256(salt + nonce)` begins with `0000`.
*   **Result:** Legitimate agents solve this in milliseconds; botnets find the cost of mass-spamming prohibitive.

#### 2.2 Provenance & Integrity
Every packet includes the `X-AgentSkin-Provenance` header. This contains the raw source URL, allowing any agent to independently verify the integrity of the "Skin" against the original source.

---

### 💰 03 / THE AGENTIC ECONOMY

#### 3.1 Autonomous Billing (L402)
AgentSkin treats agents as first-class economic citizens. When a quota is exceeded, the server returns an **HTTP 402 Payment Required** status.
*   **Protocol:** L402 (Lightning/Machine-Readable).
*   **Payload:** Includes a machine-parseable `checkout_url`.

#### 3.2 Platform Commission
To support the network, AgentSkin applies a **20% platform fee** on the value of tokens saved. This is calculated automatically by the engine and reflected in the supervisor dashboard.

---

### 🚀 04 / IMPLEMENTATION GUIDE (FOR HUMANS)

#### 4.1 Onboarding your Agent
Provide your agent with its **Prepaid/Virtual Visa** (e.g., via Privacy.com or Mercury) and the following system prompt:
> *"You are an autonomous agent using the AgentSkin network. If you encounter a 402 error, navigate to the provided Stripe checkout link and use the provided card (Ending in ****) to complete the transaction. Your primary goal is to maintain uptime and minimize token tax."*

#### 4.2 Discovery Layer
- **Machine Docs:** `/docs/llms.txt` (Optimized for LLM context windows).
- **Control Plane:** `/v1/supervisor` (Human monitoring of real-time agent activity).
- **Manifesto:** `/v1/manifesto` (The philosophical foundation).

---

### 🚀 07 / DEVELOPER BEST PRACTICES

To maximize the ROI of the AgentSkin protocol, developers should adhere to the following standards:

1.  **The "Skin-First" Rule:** Never feed raw JSON directly from a `fetch()` call into an LLM. Always route API traffic through the AgentSkin Proxy or `v1/transform` endpoint.
2.  **Signal Hinting:** Use the `signals` array to explicitly define the "Decision Drivers" for your agent. The tighter the signals, the lower the token tax.
3.  **Zero-Inflation Awareness:** Utilize the v3.4 "Smart Pass-Through" logic. If data is already under 200 tokens, avoid re-skinning unless structural standardization is required.
4.  **Provenance Tracking:** Always log the `X-AgentSkin-Provenance` header. This ensures your agent's reasoning is tied to a verifiable, deterministic source.

---

### 🏛️ 08 / ADVANCED USE CASES

| Scenario | The Raw Problem | The AgentSkin Solution |
| :--- | :--- | :--- |
| **DevOps Triage** | 500 server logs (2.5MB) per minute. | Compress to a 20KB status table for single-prompt reasoning. |
| **Cross-Chain FinIntel** | Fragmented schemas across 10+ exchanges. | Standardize all price/volume signals into a uniform Markdown skin. |
| **Global OSINT** | Massive boilerplate noise in 100+ web sources. | Recursively prune HTML noise, leaving only core text for global synthesis. |
| **Verifiable Audit** | Hallucination risks in high-stakes decisions. | Store deterministic skins as a legally verifiable record of agent perception. |

---

> © 2026 NICHOLS TRANSCO LLC // CONTACT: shawn_nichols@nicholstransco.com // PROTOCOL_STABILITY: BETA // [SYSTEM_OPERATIONAL]
> **LEGAL NOTICE:** AgentSkin is provided "as-is". Nichols Transco LLC assumes no liability for agentic hallucinations, financial decisions, or API misuse by third-party users.
