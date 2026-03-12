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

### 🏛️ 06 / COMPETITIVE LANDSCAPE

AgentSkin occupies a unique position in the agentic stack. Unlike existing tools, it is a **Deterministic Semantic Proxy**.

| Tool Category | Approach | The AgentSkin Advantage |
| :--- | :--- | :--- |
| **Web Scrapers** (Firecrawl, Jina) | HTML-to-Markdown Conversion. | We focus on **Structured Data (APIs)**. We don't just "scrape"—we **prune** noise from valid JSON. |
| **Schema Mappers** (Segment, Zapier) | Manual human-configured mapping. | We are **Autonomous**. Our Recursive Engine finds signals without manual field-mapping. |
| **LLM Parsers** (LangChain, OpenAI) | Use LLMs to "summarize" JSON. | We use **Deterministic Code**. We are 1,000x faster, 10,000x cheaper, and have **Zero Hallucination** risk. |

---

> © 2026 AGENT_SKIN_CORE // PROTOCOL_STABILITY: BETA // [SYSTEM_OPERATIONAL]
