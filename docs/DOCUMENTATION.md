# AgentSkin: Protocol Documentation (v4.2.2)

> **"The Open Standard for Semantic Data Perception."**
> **Official Host:** Nichols Transco LLC // agentskin.dev

---

### 🏛️ 00 / ABSTRACT
AgentSkin is a **Hybrid Protocol** designed to solve the "Token Tax" of the Web 2.0. It consists of an **Open Standard** for data pruning and an **Official Managed Host** for enterprise-grade execution. 

---

### 📂 01 / HYBRID ARCHITECTURE

#### 1.1 The AgentSkin Standard (Open)
The standard defines the deterministic rules for converting noisy JSON and HTML into high-density Markdown signals.
- **Goal:** Universal machine-readability.
- **Engine:** Recursive Shorthand Pruning (Deterministic).
- **Format:** Key-Value Signal Streams (90% compression).

#### 1.2 The Official Host (Managed)
Nichols Transco LLC provides the primary infrastructure for the protocol at `api.agentskin.dev`.
- **Wholesale Connectivity:** Pre-built, high-speed connections to Search, News, and Weather APIs.
- **L402 Economy:** Autonomous micro-payment handling for agents.
- **Edge Performance:** Global transformation latency <10ms via Cloudflare.

---

### 🛡️ 02 / SECURITY PROTOCOLS
AgentSkin utilizes a **Machine-Friendly PoW (Proof-of-Work)** to protect the network from botnet abuse.
- **Integrity:** Every packet includes `X-AgentSkin-Provenance` for deterministic source verification.

#### 2.1 SSRF Protection (v4.2.2+)
The reference implementation includes robust SSRF (Server-Side Request Forgery) protection:
- **Private Range Blocking:** All IPv4 private ranges blocked (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x, 0.0.0.0)
- **IPv6 Blocking:** Link-local (fe80:, fc00:), loopback (::1, ::), and IPv4-mapped IPv6 (::ffff:) addresses blocked
- **Zone ID Stripping:** IPv6 zone IDs (e.g., %eth0) are stripped before validation
- **Protocol Enforcement:** Only HTTP and HTTPS protocols allowed
- **30s Processing Timeout:** Prevents resource exhaustion from maliciously large payloads

#### 2.2 Input Validation (v4.2.2+)
All tool inputs are validated with Zod schema validation:
- URL format validation
- Type coercion for signals (array), aliases (object), apply_reasoning (boolean)
- Sanitization of HTML-extracted URLs (javascript:, data: schemes blocked)

---

### 💰 03 / THE AGENTIC ECONOMY
AgentSkin treats agents as first-class economic citizens. 
- **Platform Fee:** A flat 20% commission is applied to the value of tokens saved.
- **Autonomous Billing:** Agents pay micro-fees via L402 virtual cards to maintain network throughput.

---

### 🚀 04 / IMPLEMENTATION GUIDE

#### 4.1 HTML Support (v4.2.2+)
AgentSkin now handles both APIs and web pages. When fetching HTML content, the engine:
- Parses HTML with cheerio (BS4 equivalent)
- Extracts semantic structure: title, h1/h2, paragraphs, links, meta description
- Converts to structured JSON before pruning
- Outputs clean Markdown skin

#### 4.2 The One-Line SDK
```javascript
import { AgentSkin } from 'agentskin-js';
const skin = new AgentSkin(YOUR_API_KEY);
const data = await skin.fetch('https://api.target.com');
```

#### 4.3 Best Practices
1. **Skin-First Rule:** Never feed raw JSON directly into an LLM.
2. **Signal Hinting:** Use `signals` to explicitly define decision drivers.
3. **Zero-Inflation Guarantee:** Use v3.4+ logic to avoid re-skinning small datasets.
4. **Validate Inputs:** Always provide valid URL formats and proper types for signals/aliases.

#### 4.4 Testing (v4.2.2+)
The reference implementation includes comprehensive test coverage:
- **48 tests** covering core functionality, edge cases, and security
- SSRF protection validation (IPv4, IPv6, zone IDs, mapped addresses)
- HTML parsing verification (title, headings, links, sanitization)
- Skinning engine edge cases (null, empty, nested, arrays)
```bash
npm test  # Run all tests
npm run lint  # Lint code quality

---

### 🏛️ 05 / ADVANCED USE CASES
- **DevOps Triage:** 500+ server logs compressed into a 20KB status table.
- **Cross-Chain Finance:** Standardize fragmented crypto schemas into uniform skins.
- **Global OSINT:** Prune boilerplate noise from 100+ sources for global synthesis.

---

> © 2026 NICHOLS TRANSCO LLC // CONTACT: shawn_nichols@nicholstransco.com // [SYSTEM_OPERATIONAL]
> **LEGAL NOTICE:** AgentSkin is provided "as-is". Nichols Transco LLC assumes no liability for agentic decisions or API misuse.
