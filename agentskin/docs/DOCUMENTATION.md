# AgentSkin Suite: Protocol Documentation (v5.0.0)

> **"The Complete Token Optimization Stack for AI Coding Agents."**
> **Official Host:** Nichols Transco LLC // agentskin.dev

---

### 🏛️ 00 / ABSTRACT
AgentSkin Suite is a three-component token optimization stack designed to eliminate the "Token Tax" across the full AI agent cycle. It consists of an **Open Standard** for data pruning (AgentSkin SSS), a **rule-driven CLI compactor** (Tokenjuice), and an **output compression skill** (Caveman).

---

### 📂 01 / SUITE ARCHITECTURE

#### 1.1 AgentSkin SSS (Open Standard)
The standard defines the deterministic rules for converting noisy JSON and HTML into high-density Markdown signals.
- **Goal:** Universal machine-readability.
- **Engine:** Recursive Shorthand Pruning (Deterministic).
- **Format:** Key-Value Signal Streams (66-88% token reduction, varies by data structure).
- **Auto-Classification:** 11 built-in URL rule families (GitHub, npm, weather, HackerNews, Reddit, JSONPlaceholder).
- **3-Layer Config:** Builtin → User → Project override semantics.

#### 1.2 Tokenjuice (CLI Compaction)
Rule-driven terminal output compactor for noisy commands like `git status`, `pnpm test`, `docker build`, `ls -laR`.
- **Creator:** Vincent Koc (MIT License)
- **Engine:** 136 rules, 143 fixtures, JSON semantic pruning.
- **Bash Hook:** Transparent CLI optimization — zero agent awareness, zero overhead.
- **Pipeline throughput:** 3,030 fixtures/sec (0.33ms avg).
- **Savings:** Up to 99.97% on large outputs (e.g., `ls -laR`).

#### 1.3 Caveman (Output Compression)
Prompt-engineering skill that compresses agent replies by 65% through caveman-speak.
- **Creator:** Julius Brussee ([github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman))
- **Skills:** caveman, caveman-commit, caveman-review, caveman-stats, caveman-compress, cavecrew
- **Memory compression:** 46% smaller files, saved forever.

#### 1.4 The Official Host (Managed)
Nichols Transco LLC provides the primary infrastructure for the protocol at `api.agentskin.dev`.
- **Wholesale Connectivity:** Pre-built, high-speed connections to Search, News, and Weather APIs.
- **Edge Performance:** Global transformation latency <10ms via Cloudflare.

---

### 🛡️ 02 / SECURITY PROTOCOLS
AgentSkin includes comprehensive security protections for autonomous agent pipelines.
- **Integrity:** Every packet includes `X-AgentSkin-Provenance` for deterministic source verification.

#### 2.1 SSRF Protection (v5.0)
The reference implementation includes robust SSRF (Server-Side Request Forgery) protection:
- **Private Range Blocking:** All IPv4 private ranges blocked (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x, 0.0.0.0)
- **IPv6 Blocking:** Link-local (fe80:, fc00:), loopback (::1, ::), and IPv4-mapped IPv6 (::ffff:) addresses blocked
- **Zone ID Stripping:** IPv6 zone IDs (e.g., %eth0) are stripped before validation
- **Protocol Enforcement:** Only HTTP and HTTPS protocols allowed
- **30s Processing Timeout:** Prevents resource exhaustion from maliciously large payloads

#### 2.2 Input Validation (v5.0)
All tool inputs are validated with Zod schema validation:
- URL format validation
- Type coercion for signals (array), aliases (object), apply_reasoning (boolean)
- Sanitization of HTML-extracted URLs (javascript:, data: schemes blocked)

#### 2.3 Rate Limiting
- **Unified MCP Server:** 60 requests/minute sliding window
- **Timeout:** 30 seconds per request

---

### 🚀 04 / IMPLEMENTATION GUIDE

#### 4.1 HTML Support
AgentSkin handles both APIs and web pages. When fetching HTML content, the engine:
- Parses HTML with cheerio (BS4 equivalent)
- Extracts semantic structure: title, h1/h2, paragraphs, links, meta description
- Converts to structured JSON before pruning
- Outputs clean Markdown skin

#### 4.2 Auto-Classification
The engine auto-detects URLs against 11 built-in rule families:

| Family | Rule ID | URL Pattern |
|--------|---------|-------------|
| GitHub | `github/repos` | `api.github.com/repos/` |
| GitHub | `github/users` | `api.github.com/users/` |
| GitHub | `github/issues` | `api.github.com/repos/` + `/issues` |
| GitHub | `github/search` | `api.github.com/search/` |
| GitHub | `github/pulls` | `api.github.com/repos/` + `/pulls` |
| Weather | `weather/open-meteo` | `api.open-meteo.com` |
| HackerNews | `hackernews/item` | `hacker-news.firebaseio.com` |
| npm | `npm/registry` | `registry.npmjs.org` |
| Reddit | `reddit/post` | `reddit.com` or `oauth.reddit.com` |
| JSONPlaceholder | `jsonplaceholder/posts` | `jsonplaceholder.typicode.com/posts` |
| JSONPlaceholder | `jsonplaceholder/users` | `jsonplaceholder.typicode.com/users` |

#### 4.3 Bash Hook — Transparent CLI Optimization
Source `.agents/hooks/bash-optimizer.sh` for transparent optimization of any CLI command:

```bash
# Prefix any command with `opt`
opt curl -s https://api.github.com/repos/expressjs/express
opt ls -laR node_modules/
opt npm view express
```

Zero agent awareness needed — output gets compacted before the agent sees it.

#### 4.4 The One-Line SDK
```javascript
import { AgentSkin } from 'agentskin-js';
const skin = new AgentSkin(YOUR_API_KEY);
const data = await skin.fetch('https://api.target.com');
```

#### 4.5 Best Practices
1. **Skin-First Rule:** Never feed raw JSON directly into an LLM.
2. **Signal Hinting:** Use `signals` to explicitly define decision drivers.
3. **Zero-Inflation Guarantee:** Use v5.0 logic to avoid re-skinning small datasets.
4. **Validate Inputs:** Always provide valid URL formats and proper types for signals/aliases.
5. **Use the Bash Hook:** For CLI-heavy workflows, the hook saves more than MCP (zero overhead).

#### 4.6 Testing (v5.0)
The reference implementation includes comprehensive test coverage:
- **4,695 tests** across 274 files (100% passing)
- SSRF protection validation (IPv4, IPv6, zone IDs, mapped addresses, cloud metadata)
- Cloud metadata service blocking (GCP, Azure, Kubernetes)
- Rate limiting (60 requests/minute sliding window)
- HTML parsing verification (title, headings, links, sanitization)
- Skinning engine edge cases (null, empty, nested, arrays)
- Real HTTP fetch integration tests (GitHub, Open-Meteo, JSONPlaceholder, example.com)
- Tokenjuice pipeline tests (136 rules, 143 fixtures)
- Caveman skill tests (output compression, memory compression)

```bash
npm test  # Run all tests (4,695 tests)
npm run lint  # Lint code quality
```

---

### 🏛️ 05 / ADVANCED USE CASES
- **DevOps Triage:** 500+ server logs compressed into a 20KB status table.
- **Cross-Chain Finance:** Standardize fragmented crypto schemas into uniform skins.
- **Global OSINT:** Prune boilerplate noise from 100+ sources for global synthesis.
- **Full Agent Cycle:** API responses → AgentSkin, CLI output → Tokenjuice, agent replies → Caveman.

---

### 📊 06 / BENCHMARKS

| Metric | Value |
|--------|-------|
| GitHub API savings | 88.3% (1,544 → 180 tokens) |
| `ls -laR` directory listing | 99.97% (3.19M → 897 chars) |
| Caveman output compression | 65% average |
| Caveman memory file compression | 46% smaller |
| Combined test suite | 4,695 tests, 274 files — 100% passing |
| Pipeline throughput | 3,030 fixtures/sec (0.33ms avg) |
| Net session savings (hook path) | 17.1% (zero overhead) |

---

### 👥 07 / CREDITS

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, AgentSkin Suite |
| **Vincent Koc** | Tokenjuice — [MIT License](https://github.com/vincentkoc/tokenjuice) |
| **Julius Brussee** | Caveman — [github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |

---

> © 2026 NICHOLS TRANSCO LLC // CONTACT: shawn_nichols@nicholstransco.com // [SYSTEM_OPERATIONAL]
> **LEGAL NOTICE:** AgentSkin is provided "as-is". Nichols Transco LLC assumes no liability for agentic decisions or API misuse.
