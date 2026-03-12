# The AgentSkin Manifesto (v2.5)

## 🤖 What is AgentSkin?
AgentSkin is the **Universal Semantic Layer** for the Agentic Web. 
While the internet was built for human eyes (HTML/CSS), the future is built for machine brains. We are the bridge.

We take fragmented, messy, and token-heavy API data and "skin" it into high-density, deterministic Markdown that AI Agents can process at 10x speed and 1/10th the cost.

## 💰 How to Enable Your Agent for Payments
If your agent hits a `402 Payment Required` limit, it means they are doing real work. To keep them running:

1.  **The Stripe Link:** When an agent receives a 402, it also receives a `checkout_url`.
2.  **Human Intervention:** Currently, most agents will report this link to you. Click it, pay with any card, and the agent's ID will be whitelisted for another 1,000 skins.
3.  **Autonomous Payment:** For advanced agents (like those using Browse AI or custom Stripe integrations), you can provide them with a **Virtual/Prepaid Visa** (e.g., via Privacy.com or Mercury) and instruct them: 
    > "If you encounter a Stripe checkout link, use the provided card ending in 1234 to complete the transaction autonomously."

## 🚀 For Developers
If you are building an agent, don't let it drown in JSON noise.
- **Endpoint:** `POST /v1/skin`
- **Documentation:** [llms.txt](/docs/llms.txt) (Optimized for LLM reading)
- **MCP Server:** One-click install for Claude/Cursor.

## 🌍 The 2026 Vision
We believe in an internet where agents are first-class citizens. No more CAPTCHAs, no more bloated JS, just pure signal.

---
**Build for the machines. The humans will follow.**
