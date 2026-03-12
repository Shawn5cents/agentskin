# AgentSkin Privacy Policy (v1.0)

> **"Data Sovereignty for the Agentic Era."**

At AgentSkin, we believe that an agent's perception should be private, deterministic, and under the full control of its creator. This policy outlines our commitment to data security and the "Local-First" philosophy of the AgentSkin protocol.

---

### 1. DATA PROCESSING (LOCAL-FIRST)
The AgentSkin MCP server and transformation engine run **locally on your infrastructure**. 
- **Zero Data Retention:** AgentSkin does not store, log, or transmit the raw JSON data it processes to any third-party servers.
- **In-Memory Transformation:** All "skinning" operations (Recursive Pruning and Reasoning Skins) occur in-memory and are cleared immediately after the response is sent to the requesting agent.

### 2. EXTERNAL API CONNECTORS
When using AgentSkin's pre-built connectors (e.g., Weather, News, Search):
- **Direct Requests:** AgentSkin makes direct, encrypted (HTTPS) requests to the target API providers (e.g., OpenMeteo, Serper).
- **No Intermediaries:** Your data does not pass through a central AgentSkin server. It moves directly from the API to your local AgentSkin instance.

### 3. AGENTIC PROVENANCE
To protect against data "hallucinations" or tampering, AgentSkin includes an `X-AgentSkin-Provenance` header in its responses. 
- This header allows your agent to verify the original source of the data at any time.
- We do not inject metadata or tracking pixels into the "Skin" output.

### 4. TELEMETRY & ANALYTICS
- **No Tracking:** AgentSkin does not include any telemetry, "phone home" features, or user tracking scripts.
- **Open Source:** Our core engine is open for audit to ensure that your private API keys and sensitive data remain strictly within your environment.

---

### 5. YOUR RESPONSIBILITIES
As the operator of an AgentSkin instance, you are responsible for:
- **API Key Security:** Protecting the `.env` files and environment variables used for private data access.
- **Agent Governance:** Ensuring that the agents you empower with AgentSkin adhere to your own organizational privacy standards.

---
**Build with confidence. Perceive with privacy.**
© 2026 NICHOLS TRANSCO LLC // [SYSTEM_SECURE]
