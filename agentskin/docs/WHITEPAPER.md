# Semantic Shorthand Standard (SSS): The Agentic Perception Layer
**Protocol Specification: v5.0.0 (Suite)**
**Date:** July 2026

---

## 🏛️ I. Abstract
The current internet architecture is designed for human visual consumption. This results in high-entropy data payloads—bloated JSON, heavily nested HTML DOMs, and inconsistent metadata. When processed by Large Language Models (LLMs) or autonomous agents, this structural noise introduces a significant "Token Tax." It increases inference latency, degrades reasoning accuracy (perceptual drag), and results in exorbitant compute costs.

The **AgentSkin Suite** bundles the Semantic Shorthand Standard (SSS) alongside **Tokenjuice** (by [Vincent Koc](https://github.com/vincentkoc/tokenjuice), MIT License) and **Caveman** (by [Julius Brussee](https://github.com/JuliusBrussee/caveman)) into one unified 7-tool MCP server. SSS provides deterministic, code-based JSON pruning; Tokenjuice contributes the `reduce`, `estimate_tokens`, and `apply_json_semantic` tools; Caveman compresses agent output by 65%. Together they establish a complete token optimization layer for M2M communication.

## 🧱 II. The Perceptual Drag Problem
Transformer models utilize attention mechanisms to weigh the importance of input tokens. When forced to process raw API responses or raw HTML, models allocate attention heads to structural noise (e.g., `<div>`, `{ "@context": "..." }`, timestamps, arbitrary UUIDs). 
1. **Latency:** Processing 10,000 tokens of noise to extract 50 tokens of signal fundamentally bottlenecks real-time agentic workflows.
2. **Hallucination Vectors:** Verbose, conflicting, or deeply nested metadata can confuse model reasoning, leading to non-deterministic outputs.

## 🧬 III. The Protocol Specification
The SSS is a four-stage methodology executed at the point of data retrieval, prior to LLM ingestion.

### 1. The Intercept (Data Audit)
The protocol intercepts the raw HTTP/JSON response.

### 2. Signal Declaration
The requesting agent must explicitly declare a `signals` array. This is a whitelist of required semantic keys (e.g., `["price", "inventory", "status"]`). The pruning engine recursively traverses the data object, discarding any key-value pair not matching the declared signals.

### 3. Namespace Normalization (Aliasing)
Because web APIs are not standardized, agents often struggle with varying nomenclature (e.g., `current_price`, `price_usd`, `val`). The protocol accepts an `aliases` dictionary mapping the remote nomenclature to the agent's internal schema.

### 4. Deterministic Flattening
The resulting object is flattened into a single-level, dot-notated syntax. All JSON syntax (brackets, commas, quotes) is eradicated in favor of hierarchical Markdown.

**Raw (High Entropy):**
```json
{
  "data": {
    "items": [
      { "id": "123", "current_price": 50.00, "meta": "..." }
    ]
  }
}
```

**SSS (Low Entropy):**
```markdown
data.items[0].price: 50.00
```

## 🧠 IV. Reference Implementation Architecture
The AgentSkin Suite is distributed via the Model Context Protocol (MCP) as a unified 7-tool `agentskin-suite` server.
- **Unified Server:** Merges AgentSkin's semantic pruning (4 tools: `fetch_optimized_data`, `skin_reasoning`, `classify_url`, `strip_ansi`) with Tokenjuice's reduction engine (3 tools: `reduce`, `estimate_tokens`, `apply_json_semantic`).
- **Tokenjuice Engine:** By [Vincent Koc](https://github.com/vincentkoc/tokenjuice) (MIT License) — powers the `reduce`, `estimate_tokens`, and `apply_json_semantic` tools. Also available as a standalone CLI for non-MCP workflows.
- **Local Sovereignty:** The reference server operates strictly on the local host. Raw data is fetched and pruned locally, ensuring session privacy and zero latency.
- **Dynamic Agency:** The MCP `fetch_optimized_data` tool allows the agent to dynamically provide the URL, the `signals` array, and the `aliases` map at runtime.

## 🏁 V. Conclusion
By standardizing the formatting of machine perception, the AgentSkin Suite enables an ecosystem where agents can reason faster, cheaper, and with mathematical determinism. The protocol bridges the gap between the human web and the autonomous economy — with SSS pruning APIs, Tokenjuice compacting CLI output, and Caveman compressing agent replies.

---

## 🔒 VI. Security Considerations (v5.0.0)

The reference implementation includes robust security measures:

### SSRF Protection
Blocks requests to private network ranges:
- **IPv4:** 127.x.x.x (loopback), 10.x.x.x, 172.16-31.x.x, 192.168.x.x (private), 169.254.x.x (link-local), 0.0.0.0
- **IPv6:** ::1 (loopback), ::ffff:, fe80: (link-local)

### Cloud Metadata Blocking
Prevents access to cloud provider metadata services:
- `metadata.google.internal` (GCP)
- `metadata.azure.com` (Azure)
- `kubernetes.default.svc` (Kubernetes)

### Rate Limiting
60 requests/minute sliding window per client to prevent abuse.

### Processing Limits
- 30-second timeout per request
- 5MB maximum payload size
- 2MB maximum HTML size

These measures ensure AgentSkin Suite operates safely within autonomous agent pipelines without exposing internal network resources.

---

## 👥 VII. Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, Suite integration |
| **Vincent Koc** | Tokenjuice — MIT-licensed engine powering reduce, estimate_tokens, and apply_json_semantic in unified MCP server |
| **Julius Brussee** | Caveman — output compression via prompt engineering (65% savings) |
