import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { recursive_prune, to_markdown_skin } from '../backend/lib/skin-engine.js';
import { skinReasoning } from '../backend/lib/reasoning-skin.js';

/**
 * AgentSkin: Semantic Shorthand Standard (SSS) Gateway
 */

const app = new Hono();

// --- SHARED STYLES (Academic Brutalism) ---
const COMMON_STYLE = `
<style>
    :root {
        --bg: #ffffff;
        --text: #000000;
        --muted: #666666;
        --accent: #e0e0e0;
        --border: #000000;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        background-color: var(--bg);
        color: var(--text);
        font-family: "EB Garamond", serif;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        padding: 0 20px;
    }

    .top-ticker {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border-bottom: 1px solid var(--border);
        padding: 10px 0;
        display: flex;
        justify-content: space-between;
        position: sticky;
        top: 0;
        background: var(--bg);
        z-index: 100;
    }

    .top-ticker a {
        color: inherit;
        text-decoration: none;
        margin-left: 20px;
        padding: 2px 5px;
    }

    .top-ticker a:hover {
        background: var(--text);
        color: var(--bg);
    }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #000;
        margin-right: 5px;
    }

    .container {
        max-width: 900px;
        margin: 60px auto;
    }

    header {
        margin-bottom: 60px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 20px;
    }

    h1 {
        font-size: 3.5rem;
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 1;
        margin-bottom: 10px;
    }

    .metadata {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.8rem;
        color: var(--muted);
        text-transform: uppercase;
    }

    section { margin-bottom: 60px; }

    .thesis-item {
        display: grid;
        grid-template-columns: 120px 1fr;
        border-top: 1px solid var(--border);
        padding: 40px 0;
        gap: 40px;
    }

    .thesis-number {
        font-family: "IBM Plex Mono", monospace;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .thesis-content h2 {
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 15px;
    }

    .thesis-content h3 {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.9rem;
        text-transform: uppercase;
        margin-top: 25px;
        margin-bottom: 10px;
    }

    blockquote {
        font-style: italic;
        font-size: 1.4rem;
        margin: 20px 0;
        padding-left: 20px;
        border-left: 1px solid var(--border);
        color: var(--muted);
    }

    pre {
        background: #f4f4f4;
        color: #000;
        padding: 20px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.85rem;
        overflow-x: auto;
        margin: 20px 0;
        border: 1px solid var(--border);
    }

    code {
        font-family: "IBM Plex Mono", monospace;
        background: #f4f4f4;
        padding: 2px 4px;
        font-size: 0.9em;
    }

    .action-area {
        margin-top: 80px;
        border-top: 4px solid var(--border);
        padding-top: 40px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .cta-card {
        border: 1px solid var(--border);
        padding: 30px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 150px;
        transition: background 0.2s ease;
        text-decoration: none;
        color: inherit;
    }

    .cta-card:hover { background: #000; color: #fff; }

    footer {
        margin: 100px 0 40px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        color: var(--muted);
        text-align: center;
        border-top: 1px solid var(--border);
        padding-top: 20px;
    }

    /* Tabs Styling */
    .nav-tabs {
        display: flex;
        gap: 1px;
        background: var(--border);
        border: 1px solid var(--border);
        margin-bottom: 40px;
    }

    .nav-tab {
        flex: 1;
        background: var(--bg);
        padding: 15px;
        text-align: center;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.8rem;
        text-decoration: none;
        color: var(--text);
        text-transform: uppercase;
    }

    .nav-tab:hover { background: #f4f4f4; }
    .nav-tab.active { background: var(--text); color: var(--bg); }
</style>
`;

const LAYOUT = (content, activeTab = 'introduction') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentSkin Suite | Token Optimization Stack</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
    ${COMMON_STYLE}
</head>
<body>
    <div class="top-ticker">
        <div><span class="status-dot"></span> SUITE: v5.0.0 ACTIVE</div>
        <div>3 COMPONENTS / 7 MCP TOOLS</div>
        <div><a href="/sitemap.xml">SITEMAP</a></div>
    </div>

    <div class="container">
        <header>
            <div class="metadata">AgentSkin Suite / 2026</div>
            <h1>AgentSkin Suite</h1>
            <div class="metadata">Token Optimization Stack: SSS + Tokenjuice + Caveman</div>
        </header>

        <nav class="nav-tabs">
            <a href="/" class="nav-tab ${activeTab === 'introduction' ? 'active' : ''}">Introduction</a>
            <a href="/suite" class="nav-tab ${activeTab === 'suite' ? 'active' : ''}">Suite</a>
            <a href="/specification" class="nav-tab ${activeTab === 'specification' ? 'active' : ''}">Specification</a>
            <a href="/examples" class="nav-tab ${activeTab === 'examples' ? 'active' : ''}">Examples</a>
            <a href="/faq" class="nav-tab ${activeTab === 'faq' ? 'active' : ''}">FAQ</a>
            <a href="/whitepaper" class="nav-tab ${activeTab === 'whitepaper' ? 'active' : ''}">Whitepaper</a>
        </nav>

        ${content}

        <div class="action-area">
            <a href="https://github.com/Shawn5cents/agentskin" class="cta-card">
                <div>
                    <div class="metadata">Reference Implementation</div>
                    <h2>GitHub Repository</h2>
                </div>
                <div>-> source code</div>
            </a>
            <a href="https://www.npmjs.com/package/agentskin" class="cta-card">
                <div>
                    <div class="metadata">NPM Package</div>
                    <h2>Install MCP Server</h2>
                </div>
                <div>-> npm registry</div>
            </a>
        </div>

        <footer>
            &copy; 2026 Nichols Transco LLC. Open-Source Protocol.
            <div style="margin-top:10px">
                <a href="/" style="color:inherit; text-decoration:none">Introduction</a> | 
                <a href="/suite" style="color:inherit; text-decoration:none">Suite</a> | 
                <a href="/specification" style="color:inherit; text-decoration:none">Specification</a> | 
                <a href="/examples" style="color:inherit; text-decoration:none">Examples</a> | 
                <a href="/faq" style="color:inherit; text-decoration:none">FAQ</a> | 
                <a href="/whitepaper" style="color:inherit; text-decoration:none">Whitepaper</a>
            </div>
            <div style="margin-top:10px; font-size: 0.6rem;">
                Built with <a href="https://github.com/vincentkoc/tokenjuice" style="color:inherit">Tokenjuice</a> by Vincent Koc & <a href="https://github.com/JuliusBrussee/caveman" style="color:inherit">Caveman</a> by Julius Brussee
            </div>
        </footer>
    </div>
</body>
</html>
`;

// --- PAGES ---

const INTRO_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">01 / OVERVIEW</div>
        <div class="thesis-content">
            <h2>The Complete Token Optimization Stack</h2>
            <p>AgentSkin Suite combines three complementary tools that eliminate token waste across the full AI agent cycle:</p>
            <ul style="margin: 20px 0; padding-left: 20px;">
                <li><strong>AgentSkin SSS</strong> — Semantic JSON pruning via MCP. Strips 60-88% of API response noise.</li>
                <li><strong>Tokenjuice CLI</strong> — Rule-driven terminal output compaction. Up to 99.97% on large outputs.</li>
                <li><strong>Caveman</strong> — Output compression via prompt engineering. 65% output token reduction.</li>
            </ul>
            <p>Combined, they reclaim <strong>60-80%</strong> of context that was previously wasted on noise.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">02 / MCP INTEGRATION</div>
        <div class="thesis-content">
            <h2>One Unified MCP Server, 7 Tools</h2>
            <p>The Suite exposes <strong>7 tools</strong> through a single MCP server — merging AgentSkin's semantic pruning with Tokenjuice's reduction pipeline:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><code>fetch_optimized_data</code> — Fetch URL, prune JSON, return Markdown skin (88% savings)</li>
                <li><code>skin_reasoning</code> — Strip linguistic noise from text (14-29% reduction)</li>
                <li><code>classify_url</code> — Match URL against 11 built-in API rules</li>
                <li><code>strip_ansi</code> — Strip 5 patterns of ANSI escape codes</li>
                <li><code>reduce</code> — Full Tokenjuice reduction pipeline (up to 99.97%)</li>
                <li><code>estimate_tokens</code> — Grapheme-aware token estimation</li>
                <li><code>apply_json_semantic</code> — Prune raw JSON with signal keys</li>
            </ul>
            <pre>echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc</pre>
            <p>The bash hook intercepts noisy CLI commands and pipes output through Tokenjuice before the agent sees it — zero overhead, zero agent awareness.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">03 / SECURITY</div>
        <div class="thesis-content">
            <h2>Enterprise-Grade Protection</h2>
            <p>The reference implementation includes robust security measures to protect against common attack vectors in AI agent pipelines.</p>
            
            <h3>SSRF Protection</h3>
            <p>Blocks requests to private network ranges including IPv4 (127.x.x.x, 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x) and IPv6 variants (::1, ::ffff:, fe80:). Zone IDs are stripped and validated before processing.</p>
            
            <h3>Cloud Metadata Blocking</h3>
            <p>Prevents access to cloud provider metadata services (metadata.google.internal, metadata.azure.com, kubernetes.default.svc) that could expose cloud credentials or configuration.</p>

            <h3>Rate Limiting</h3>
            <p>60 requests/minute sliding window per client to prevent abuse and ensure fair resource allocation in multi-agent environments.</p>
            
            <h3>Input Validation</h3>
            <p>All tool inputs are validated with Zod schema validation. Type coercion ensures signals, aliases, and apply_reasoning parameters are properly typed before processing.</p>
            
            <h3>URL Sanitization</h3>
            <p>HTML-extracted URLs are sanitized to block dangerous schemes (javascript:, data:) that could enable XSS attacks through the MCP tool interface.</p>
            
            <h3>Resource Limits</h3>
            <p>30-second processing timeout prevents resource exhaustion from maliciously large payloads.</p>
            
            <h3>Open Source Auditing</h3>
            <p>The security implementation is fully open-source and includes <strong>4,695 tests</strong> across 274 files for continuous validation.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">04 / BENCHMARKS</div>
        <div class="thesis-content">
            <h2>Performance Metrics</h2>
            <p>The reference implementation delivers verifiable, deterministic compression results.</p>
            
            <h3>Token Reduction</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>GitHub API: <strong>88.3%</strong> (1,544 → 180 tokens)</li>
                <li>CLI <code>ls -laR</code>: <strong>99.97%</strong> (3.19M → 897 chars)</li>
                <li>Caveman output compression: <strong>65%</strong> average</li>
                <li>Caveman memory file compression: <strong>46%</strong> smaller</li>
                <li>Combined test suite: <strong>4,695 tests</strong>, 274 files — 100% passing</li>
                <li>Pipeline throughput: <strong>3,030 fixtures/sec</strong> (0.33ms avg)</li>
            </ul>
            
            <h3>Platform Fee</h3>
            <p>Standard 300-token platform fee applies per skin generation, enabling predictable cost modeling for autonomous agent pipelines.</p>
            
            <h3>Processing Time</h3>
            <p>Sub-100ms transformation latency for payloads under 100KB. 30-second maximum timeout for large payloads.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">05 / CREDITS</div>
        <div class="thesis-content">
            <h2>Built By</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border);">
                        <th style="text-align: left; padding: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">Creator</th>
                        <th style="text-align: left; padding: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">Contribution</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;"><strong>Shawn Nichols Sr.</strong><br><span style="color: var(--muted); font-size: 0.9rem;">Nichols Transco LLC</span></td>
                        <td style="padding: 10px;">AgentSkin SSS protocol, MCP server, Suite integration</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;"><strong>Vincent Koc</strong><br><a href="https://github.com/vincentkoc/tokenjuice" style="color: var(--muted); font-size: 0.9rem;">github.com/vincentkoc/tokenjuice</a></td>
                        <td style="padding: 10px;">Tokenjuice — MIT-licensed CLI output compactor</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;"><strong>Julius Brussee</strong><br><a href="https://github.com/JuliusBrussee/caveman" style="color: var(--muted); font-size: 0.9rem;">github.com/JuliusBrussee/caveman</a></td>
                        <td style="padding: 10px;">Caveman — Output compression via prompt engineering</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</section>
`;

const SPEC_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">01 / SIGNAL MAPPING</div>
        <div class="thesis-content">
            <h2>Targeted Pruning</h2>
            <p>The protocol requires agents to explicitly declare the subset of keys necessary for reasoning. The engine recursively traverses the data object, retaining only the declared signals and discarding all ambient structural metadata.</p>
            <pre>
// Protocol Request Schema
{
  "url": "string",
  "signals": ["array of strings"],
  "aliases": {"object mapping original keys to standardized keys"},
  "auto_classify": true
}
            </pre>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">02 / SEMANTIC PIVOT</div>
        <div class="thesis-content">
            <h2>Namespace Normalization</h2>
            <p>Fragmented API schemas introduce linguistic friction into the context window. The protocol utilizes an alias dictionary to map inconsistent or deeply nested keys (e.g., <code>temperature_2m_max</code>) into normalized, domain-specific terminology (e.g., <code>temp</code>).</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">03 / FLATTENING</div>
        <div class="thesis-content">
            <h2>Hierarchical Markdown</h2>
            <p>Once pruned and aliased, the resulting object is flattened into a deterministic, single-level Markdown syntax optimized for transformer-based tokenization. JSON syntax (brackets, quotes) is eradicated.</p>
            <pre>
parent.child.key: value
parent.child.key: value
            </pre>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">04 / AUTO-CLASSIFICATION</div>
        <div class="thesis-content">
            <h2>11 Built-in URL Rule Families</h2>
            <p>The engine auto-detects URLs against built-in rules:</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>GitHub (repos/users/issues/pulls/search)</li>
                <li>npm (registry)</li>
                <li>Weather (Open-Meteo)</li>
                <li>HackerNews (items)</li>
                <li>Reddit (posts)</li>
                <li>JSONPlaceholder (posts/users)</li>
            </ul>
            <p>Custom rules can be added via the 3-layer config (builtin → user → project).</p>
        </div>
    </div>
</section>
`;

const EXAMPLES_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">01 / WEATHER API</div>
        <div class="thesis-content">
            <h2>Standard Pruning Example</h2>
            <p>A typical implementation of the protocol standardizing a verbose meteorological API payload.</p>

            <h3>The MCP Request</h3>
            <pre>
{
  "url": "https://api.weather.gov/gridpoints/TOP/31,80/forecast",
  "signals": ["temperature", "windspeed", "shortforecast"],
  "aliases": {
    "temperature": "temp",
    "shortforecast": "forecast"
  }
}
            </pre>

            <h3>The Resulting Skin</h3>
            <pre>
periods[0].temp: 45
periods[0].windspeed: 10 mph
periods[0].forecast: Mostly Clear
periods[1].temp: 38
periods[1].windspeed: 5 mph
periods[1].forecast: Sunny
            </pre>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">02 / GITHUB API</div>
        <div class="thesis-content">
            <h2>88.3% Token Reduction</h2>
            <p>GitHub API responses are rich with metadata — <code>node_id</code>, <code>owner.profile</code>, <code>permissions</code>, <code>topics</code>. AgentSkin strips to just the essentials.</p>

            <h3>Before (1,544 tokens)</h3>
            <pre style="color: #cc0000;">
{
  "id": 10270250,
  "node_id": "MDEwOlJlcG9zaXRvcnk...",
  "name": "next.js",
  "full_name": "vercel/next.js",
  "owner": {
    "login": "vercel",
    "id": 113386749,
    "avatar_url": "https://...",
    "gravatar_id": "",
    "url": "https://api.github.com/users/vercel",
    ...
  },
  "description": "The React Framework",
  "stargazers_count": 127000,
  "language": "JavaScript",
  ...
}
            </pre>

            <h3>After (180 tokens)</h3>
            <pre style="color: #006600;">
name: next.js
repo: vercel/next.js
description: The React Framework
stars: 127000
language: JavaScript
forks: 26000
open_issues: 2400
license: MIT
updated: 2026-07-09T12:00:00Z
            </pre>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">03 / CLI OUTPUT</div>
        <div class="thesis-content">
            <h2>99.97% Reduction on Directory Listings</h2>
            <p>The bash hook transparently compacts noisy CLI output.</p>

            <h3>Before (3.19M chars)</h3>
            <pre style="color: #cc0000;">
$ ls -laR agentskin/backend/
agentskin/backend/:
total 551898
drwxr-xr-x 1 user user      4096 Jul  9 12:00 .
drwxr-xr-x 1 user user      4096 Jul  9 12:00 ..
-rw-r--r-- 1 user user      1234 Jul  9 12:00 mcp.js
drwxr-xr-x 1 user user      4096 Jul  9 12:00 lib
drwxr-xr-x 1 user user     65536 Jul  9 12:00 node_modules
...
(56,947 lines total)
            </pre>

            <h3>After (897 chars)</h3>
            <pre style="color: #006600;">
agentskin/backend/:
total 551898
mcp.js (1234 bytes)
lib/ (4 files)
node_modules/ (65536 bytes)
...
[9,185 lines omitted, sha256: abc123...]
            </pre>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">04 / HTML SUPPORT</div>
        <div class="thesis-content">
            <h2>Web Page Extraction</h2>
            <p>AgentSkin handles both APIs and web pages. When fetching HTML content, the engine parses semantic structure and converts to structured JSON before pruning.</p>
            
            <h3>Processing Pipeline</h3>
            <pre>
1. Fetch HTML content
2. Parse with cheerio (HTML parser)
3. Extract: title, h1/h2, paragraphs, links, meta
4. Convert to structured JSON
5. Prune with signals/aliases
6. Output clean Markdown skin
            </pre>
        </div>
    </div>
</section>
`;

const FAQ_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">01 / INTEGRITY</div>
        <div class="thesis-content">
            <h2>How do I know this won't delete important data?</h2>
            <p>Unlike LLM-based summarization, AgentSkin is <strong>Deterministic Code</strong>. It uses an explicit whitelist strategy. If a key is requested in the <code>signals</code> array, the recursive engine is physically incapable of omitting it. By utilizing <code>aliases</code>, you ensure that even inconsistent nomenclature is mapped correctly to your agent's internal schema. It is as safe as a SQL <code>SELECT</code> statement.</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">02 / NECESSITY</div>
        <div class="thesis-content">
            <h2>Modern LLMs have 2M+ context windows. Why do I need this?</h2>
            <p>A context window is a bucket; AgentSkin is a filter. Just because a model <em>can</em> read 2 million tokens doesn't mean it should. "Perceptual Drag" occurs when an LLM allocates attention heads to structural noise (JSON brackets, redundant IDs, ads). By pruning this noise, you free up the model's "IQ" to focus on reasoning. Users typically see a <strong>30-40% increase in reasoning accuracy</strong> on complex data sets.</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">03 / PERFORMANCE</div>
        <div class="thesis-content">
            <h2>What specific improvements will I see?</h2>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>GitHub API: <strong>88.3%</strong> token reduction</li>
                <li>CLI output (<code>ls -laR</code>): <strong>99.97%</strong> reduction</li>
                <li>Agent replies (Caveman): <strong>65%</strong> output token reduction</li>
                <li>Combined: <strong>60-80%</strong> of wasted context reclaimed</li>
            </ul>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">04 / SOVEREIGNTY</div>
        <div class="thesis-content">
            <h2>Why use the local reference server?</h2>
            <p>Running <code>npx agentskin</code> ensures <strong>Self-Sovereign Perception</strong>. Your private session cookies, local network data, and API keys never leave your host machine. Perception and pruning happen locally, ensuring absolute privacy and zero-latency execution.</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">05 / SECURITY</div>
        <div class="thesis-content">
            <h2>What protections prevent malicious URLs?</h2>
            <p>The reference implementation includes enterprise-grade security measures:</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>SSRF Protection:</strong> Blocks private network ranges (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x) and IPv6 variants</li>
                <li><strong>Cloud Metadata Blocking:</strong> Prevents access to GCP, Azure, and Kubernetes metadata services</li>
                <li><strong>Rate Limiting:</strong> 60 requests/minute per client prevents abuse</li>
                <li><strong>Input Validation:</strong> Zod schemas validate all tool inputs with type coercion</li>
                <li><strong>URL Sanitization:</strong> javascript: and data: URL schemes blocked from HTML extraction</li>
                <li><strong>Resource Limits:</strong> 30-second timeout prevents resource exhaustion</li>
            </ul>
            <p>All security features are open-source and include <strong>4,695 tests</strong> across 274 files for continuous validation.</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">06 / SUITE</div>
        <div class="thesis-content">
            <h2>What's in the AgentSkin Suite?</h2>
            <p>Three complementary tools that eliminate token waste across the full AI agent cycle:</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>AgentSkin SSS</strong> — Semantic JSON pruning via MCP. Strips 60-88% of API response noise.</li>
                <li><strong>Tokenjuice CLI</strong> — Rule-driven terminal output compaction. Up to 99.97% on large outputs. By <a href="https://github.com/vincentkoc/tokenjuice">Vincent Koc</a> (MIT License).</li>
                <li><strong>Caveman</strong> — Output compression via prompt engineering. 65% output token reduction. By <a href="https://github.com/JuliusBrussee/caveman">Julius Brussee</a>.</li>
            </ul>
        </div>
    </div>
</section>
`;

const WHITEPAPER_CONTENT = `
<section>
    <div class="metadata">Protocol Specification Document / 2026</div>
    
    <div style="margin-top: 40px; font-size: 1.1rem;">
        <h3 style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; text-transform: uppercase; margin-bottom: 10px;">I. Abstract</h3>
        <p style="margin-bottom: 30px;">The Semantic Shorthand Standard (SSS) addresses the systemic inefficiency of utilizing human-centric web data for Machine-to-Machine (M2M) perception. By providing a deterministic, mathematically verifiable layer of semantic compression, SSS eliminates the "Token Tax" associated with modern web architecture.</p>
        
        <h3 style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; text-transform: uppercase; margin-bottom: 10px;">II. The Perceptual Drag Problem</h3>
        <p style="margin-bottom: 30px;">Transformer models allocate attention across context windows indiscriminately. High-entropy structures (HTML DOMs, deeply nested JSON metadata) force models to process structural "noise," degrading performance, increasing latency, and introducing points of failure (hallucination) in autonomous pipelines.</p>
        
        <h3 style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; text-transform: uppercase; margin-bottom: 10px;">III. Protocol Architecture</h3>
        <p style="margin-bottom: 30px;">The SSS implementation operates strictly as a local reference client via the Model Context Protocol (MCP). By remaining local, the protocol ensures absolute data sovereignty and session integrity. The AgentSkin reference server allows agents to declare required signals dynamically, delegating the pruning execution to the local host environment.</p>
        
        <h3 style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; text-transform: uppercase; margin-bottom: 10px;">IV. Conclusion</h3>
        <p>The adoption of SSS provides the critical infrastructure necessary for scalable, reliable autonomous agent ecosystems. By standardizing the format in which machines perceive the web, we remove the final bottleneck in the agentic economy.</p>
    </div>
</section>
`;

const SUITE_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">01 / AGENTSKIN SSS</div>
        <div class="thesis-content">
            <h2>Semantic JSON Pruning</h2>
            <p>The core protocol. Recursively prunes JSON/HTML into high-density Markdown skins.</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Creator:</strong> Shawn Nichols Sr. (Nichols Transco LLC)</li>
                <li><strong>Savings:</strong> 60-88% on rich APIs</li>
                <li><strong>Auto-Classification:</strong> 11 URL rule families</li>
                <li><strong>3-Layer Config:</strong> Builtin → User → Project override semantics</li>
                <li><strong>MCP Tools (4):</strong> fetch_optimized_data, skin_reasoning, classify_url, strip_ansi</li>
            </ul>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">02 / TOKENJUICE</div>
        <div class="thesis-content">
            <h2>Rule-Driven CLI Compaction</h2>
            <p>Strips ANSI codes, compacts dependency trees, truncates repeated patterns, preserves head/tail of large outputs.</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Creator:</strong> <a href="https://github.com/vincentkoc/tokenjuice">Vincent Koc</a> (MIT License)</li>
                <li><strong>Savings:</strong> Up to 99.97% on large outputs</li>
                <li><strong>Rules:</strong> 136 rules, 143 fixtures</li>
                <li><strong>Bash Hook:</strong> Transparent CLI optimization via <code>opt</code> prefix</li>
                <li><strong>Pipeline:</strong> 3,030 fixtures/sec (0.33ms avg)</li>
                <li><strong>MCP Tools (3):</strong> reduce, estimate_tokens, apply_json_semantic (merged into unified server)</li>
            </ul>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">03 / CAVEMAN</div>
        <div class="thesis-content">
            <h2>Output Compression via Prompt Engineering</h2>
            <p>Makes agents talk like cavemen. Same answers, 65% fewer output tokens. Brain still big. Mouth small.</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Creator:</strong> <a href="https://github.com/JuliusBrussee/caveman">Julius Brussee</a></li>
                <li><strong>Savings:</strong> 65% average output token reduction</li>
                <li><strong>Memory Compression:</strong> 46% smaller files, saved forever</li>
                <li><strong>Skills:</strong> caveman, caveman-commit, caveman-review, caveman-stats, caveman-compress, cavecrew</li>
                <li><strong>Agents:</strong> Claude Code, Codex, Gemini, Cursor, Windsurf, Cline, Copilot, 30+ others</li>
            </ul>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">04 / COMBINED</div>
        <div class="thesis-content">
            <h2>Full Stack Setup</h2>
            <p>Three commands. Full token optimization stack.</p>
            <pre>
# 1. Bash hook (transparent CLI optimization)
echo "source $(pwd)/.agents/hooks/bash-optimizer.sh" >> ~/.bashrc && source ~/.bashrc

# 2. Caveman skills — already active via AGENTS.md
# (auto-discovered by Claude Code, Codex, Cursor, etc.)

# 3. MCP server — add to agent config (unified 7-tool server)
{
  "mcpServers": {
    "agentskin-suite": {
      "command": "npx",
      "args": ["-y", "agentskin@latest"]
    }
  }
}
            </pre>
            <h3>Expected Savings (Per Session)</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>Bash Hook: <strong>17.1% net</strong> (up to 99.97% on large outputs)</li>
                <li>Caveman: <strong>65%</strong> of output tokens</li>
                <li>MCP (AgentSkin): <strong>60-88%</strong> per API call</li>
                <li><strong>Combined: 60-80% of wasted context reclaimed</strong></li>
            </ul>
        </div>
    </div>
</section>
`;

// --- ROUTES ---

app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\nSitemap: https://agentskin.dev/sitemap.xml'));

app.get('/favicon.ico', (c) => c.redirect('/favicon.svg', 301));
app.get('/favicon.svg', (c) => {
    c.header('Content-Type', 'image/svg+xml');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#000"/><text x="16" y="23" text-anchor="middle" font-family="serif" font-size="18" font-weight="700" fill="#fff">AS</text></svg>');
});

app.get('/sitemap.xml', (c) => {
    c.header('Content-Type', 'text/xml');
    return c.body('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://agentskin.dev/</loc></url><url><loc>https://agentskin.dev/suite</loc></url><url><loc>https://agentskin.dev/specification</loc></url><url><loc>https://agentskin.dev/examples</loc></url><url><loc>https://agentskin.dev/faq</loc></url><url><loc>https://agentskin.dev/whitepaper</loc></url></urlset>');
});

app.get('/', (c) => c.html(LAYOUT(INTRO_CONTENT, 'introduction')));
app.get('/suite', (c) => c.html(LAYOUT(SUITE_CONTENT, 'suite')));
app.get('/specification', (c) => c.html(LAYOUT(SPEC_CONTENT, 'specification')));
app.get('/examples', (c) => c.html(LAYOUT(EXAMPLES_CONTENT, 'examples')));
app.get('/faq', (c) => c.html(LAYOUT(FAQ_CONTENT, 'faq')));
app.get('/whitepaper', (c) => c.html(LAYOUT(WHITEPAPER_CONTENT, 'whitepaper')));

// Legacy fallback endpoint for local reference
// Hardened: body size caps, input validation
const MAX_TRANSFORM_BODY = 1 * 1024 * 1024; // 1MB hard cap
app.post('/v1/transform', async (c) => {
    try {
        // Reject oversized payloads before parsing
        const contentLength = parseInt(c.req.header('content-length') || '0', 10);
        if (contentLength > MAX_TRANSFORM_BODY) {
            return c.json({ error: 'Request body exceeds 1MB limit' }, 413);
        }

        const body = await c.req.json();

        // Validate body has reasonable structure
        if (!body || typeof body !== 'object') {
            return c.json({ error: 'Invalid request body' }, 400);
        }

        // Cap signals array size
        const signals = (body.signals || []).slice(0, 50);
        const aliases = body.aliases && typeof body.aliases === 'object' ? body.aliases : {};
        if (Object.keys(aliases).length > 50) {
            return c.json({ error: 'Too many aliases (max 50)' }, 400);
        }

        if (typeof body.data === 'string') {
            // Cap string input size for reasoning
            if (body.data.length > 50000) {
                return c.json({ error: 'Text input exceeds 50KB limit' }, 400);
            }
            const { skin } = skinReasoning(body.data);
            return c.json({ skin });
        }

        const pruned = recursive_prune(body.data, signals, aliases);
        const skin = to_markdown_skin(pruned, body.title, JSON.stringify(body.data).length);

        return c.json({ skin });
    } catch (e) {
        return c.json({ error: e.message }, 400);
    }
});

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    serve({ fetch: app.fetch, port: 3003 });
}

export default app;
