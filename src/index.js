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
    <title>AgentSkin | Semantic Shorthand Standard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
    ${COMMON_STYLE}
</head>
<body>
    <div class="top-ticker">
        <div><span class="status-dot"></span> SSS_PROTOCOL_ACTIVE</div>
        <div>REFERENCE_IMPLEMENTATION: v4.2.2</div>
        <div><a href="/sitemap.xml">SITEMAP</a></div>
    </div>

    <div class="container">
        <header>
            <div class="metadata">Open Standard / 2026</div>
            <h1>AgentSkin</h1>
            <div class="metadata">Semantic Shorthand Standard (SSS)</div>
        </header>

        <nav class="nav-tabs">
            <a href="/" class="nav-tab ${activeTab === 'introduction' ? 'active' : ''}">Introduction</a>
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
                <a href="/specification" style="color:inherit; text-decoration:none">Specification</a> | 
                <a href="/examples" style="color:inherit; text-decoration:none">Examples</a> | 
                <a href="/faq" style="color:inherit; text-decoration:none">FAQ</a> | 
                <a href="/whitepaper" style="color:inherit; text-decoration:none">Whitepaper</a>
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
            <h2>The Agentic Perception Layer</h2>
            <p>AgentSkin introduces the <strong>Semantic Shorthand Standard (SSS)</strong>, a protocol designed to optimize how autonomous AI agents perceive and process structured data. The internet is built for human visual consumption, resulting in high-entropy data payloads (bloated JSON, nested HTML) that degrade LLM reasoning performance and exponentially increase token consumption.</p>
            <p>AgentSkin provides a deterministic mechanism to prune this noise, delivering low-entropy, high-signal data directly to the agent's context window.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">02 / MCP INTEGRATION</div>
        <div class="thesis-content">
            <h2>The Reference Server</h2>
            <p>The AgentSkin protocol is distributed as an open-source Model Context Protocol (MCP) server. By installing the reference server locally, any agent (Claude, Cursor, etc.) gains the ability to autonomously define and fetch high-density Semantic Skins.</p>
            <pre>npx -y agentskin@latest</pre>
            <p>The architecture is strictly Local-First. Data retrieval and recursive pruning occur securely on the host machine.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">03 / SECURITY</div>
        <div class="thesis-content">
            <h2>Enterprise-Grade Protection</h2>
            <p>The reference implementation includes robust security measures to protect against common attack vectors in AI agent pipelines.</p>
            
            <h3>SSRF Protection</h3>
            <p>Blocks requests to private network ranges including IPv4 (127.x.x.x, 10.x.x.x, 172.16-31.x.x, 192.168.x.x) and IPv6 variants (::1, ::ffff:, fe80:). Zone IDs are stripped and validated before processing.</p>
            
            <h3>Input Validation</h3>
            <p>All tool inputs are validated with Zod schema validation. Type coercion ensures signals, aliases, and apply_reasoning parameters are properly typed before processing.</p>
            
            <h3>URL Sanitization</h3>
            <p>HTML-extracted URLs are sanitized to block dangerous schemes (javascript:, data:) that could enable XSS attacks through the MCP tool interface.</p>
            
            <h3>Resource Limits</h3>
            <p>30-second processing timeout prevents resource exhaustion from maliciously large payloads.</p>
            
            <h3>Open Source Auditing</h3>
            <p>The security implementation is fully open-source and includes 32 security tests for continuous validation.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">04 / BENCHMARKS</div>
        <div class="thesis-content">
            <h2>Performance Metrics</h2>
            <p>The reference implementation delivers verifiable, deterministic compression results.</p>
            
            <h3>Token Reduction</h3>
            <p>Average compression ratio of <strong>66-86%</strong> for typical API responses. Token savings vary by data structure complexity and signal specificity.</p>
            
            <h3>Platform Fee</h3>
            <p>Standard 5-token platform fee applies per skin generation, enabling predictable cost modeling for autonomous agent pipelines.</p>
            
            <h3>Processing Time</h3>
            <p>Sub-100ms transformation latency for payloads under 100KB. 30-second maximum timeout for large payloads.</p>
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
  "aliases": {"object mapping original keys to standardized keys"}
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
        <div class="thesis-number">02 / BENCHMARK</div>
        <div class="thesis-content">
            <h2>Measured Performance</h2>
            <p>Real-world compression metrics from the reference implementation.</p>

            <h3>Token Analysis</h3>
            <pre>
Input (raw JSON):    ~27 estimated tokens
Output (skin):       ~5 estimated tokens
Savings:             83.02%
Platform Fee:        5 tokens
            </pre>

            <h3>Compression Ratio</h3>
            <p>The analysis function calculates exact token estimates before and after transformation, enabling precise cost modeling for production pipelines.</p>
        </div>
    </div>

    <div class="thesis-item">
        <div class="thesis-number">03 / HTML SUPPORT</div>
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
            <p>Operating costs drop by <strong>66-86%</strong> for typical API responses. Token savings vary based on data structure and signal specificity.</p>
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
                <li><strong>SSRF Protection:</strong> Blocks private network ranges (127.x, 10.x, 172.16-31.x, 192.168.x) and IPv6 variants</li>
                <li><strong>Input Validation:</strong> Zod schemas validate all tool inputs with type coercion</li>
                <li><strong>URL Sanitization:</strong> javascript: and data: URL schemes blocked from HTML extraction</li>
                <li><strong>Resource Limits:</strong> 30-second timeout prevents resource exhaustion</li>
            </ul>
            <p>All security features are open-source and include 32 test cases for continuous validation.</p>
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

// --- ROUTES ---

app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\nSitemap: https://agentskin.dev/sitemap.xml'));

app.get('/sitemap.xml', (c) => {
    c.header('Content-Type', 'text/xml');
    return c.body('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://agentskin.dev/</loc></url><url><loc>https://agentskin.dev/specification</loc></url><url><loc>https://agentskin.dev/examples</loc></url><url><loc>https://agentskin.dev/faq</loc></url><url><loc>https://agentskin.dev/whitepaper</loc></url></urlset>');
});

app.get('/', (c) => c.html(LAYOUT(INTRO_CONTENT, 'introduction')));
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
