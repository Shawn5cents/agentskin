import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { recursive_prune, to_markdown_skin } from '../../backend/lib/skin-engine.js';
import { skinReasoning } from '../../backend/lib/reasoning-skin.js';

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
    <title>AgentSkin | Context Middleware for AI Agents</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
    ${COMMON_STYLE}
</head>
<body>
    <div class="top-ticker">
        <div><span class="status-dot"></span> AGENTSKIN: v5.1.0</div>
        <div>CONTEXT MIDDLEWARE / 8 MCP TOOLS</div>
        <div><a href="/autonomy-ratings">AUTONOMY RATINGS</a><a href="/sitemap.xml">SITEMAP</a></div>
    </div>

    <div class="container">
        <header>
            <div class="metadata">AgentSkin / 2026</div>
            <h1>AgentSkin</h1>
            <div class="metadata">Context Middleware for AI Agents</div>
        </header>

        <nav class="nav-tabs">
            <a href="/" class="nav-tab ${activeTab === 'introduction' ? 'active' : ''}">Introduction</a>
            <a href="/suite" class="nav-tab ${activeTab === 'suite' ? 'active' : ''}">Architecture</a>
            <a href="/specification" class="nav-tab ${activeTab === 'specification' ? 'active' : ''}">Specification</a>
            <a href="/examples" class="nav-tab ${activeTab === 'examples' ? 'active' : ''}">Examples</a>
            <a href="/bash-hook" class="nav-tab ${activeTab === 'bash-hook' ? 'active' : ''}">Bash Hook</a>
            <a href="/faq" class="nav-tab ${activeTab === 'faq' ? 'active' : ''}">FAQ</a>
            <a href="/whitepaper" class="nav-tab ${activeTab === 'whitepaper' ? 'active' : ''}">Whitepaper</a>
            <a href="https://github.com/Shawn5cents/agentskin" class="nav-tab" target="_blank" rel="noopener">GitHub ↗</a>
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
                <a href="/suite" style="color:inherit; text-decoration:none">Architecture</a> |
                <a href="/specification" style="color:inherit; text-decoration:none">Specification</a> |
                <a href="/examples" style="color:inherit; text-decoration:none">Examples</a> |
                <a href="/bash-hook" style="color:inherit; text-decoration:none">Bash Hook</a> |
                <a href="/faq" style="color:inherit; text-decoration:none">FAQ</a> |
                <a href="/whitepaper" style="color:inherit; text-decoration:none">Whitepaper</a> |
                <a href="/autonomy-ratings" style="color:inherit; text-decoration:none">Autonomy Ratings</a>
            </div>
            <div style="margin-top:10px; font-size: 0.6rem;">
                CLI reduction uses <a href="https://github.com/vincentkoc/tokenjuice" style="color:inherit">Tokenjuice</a> by Vincent Koc (MIT)
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
        <div class="thesis-number">01 / PURPOSE</div>
        <div class="thesis-content">
            <h2>Less tool noise. More task-relevant context.</h2>
            <p>AgentSkin sits between APIs, structured data, terminal output, and an AI agent. It preserves selected facts and removes low-value context before the model sees it.</p>
            <blockquote>Fidelity first. Compression second.</blockquote>
            <h3>Install</h3>
            <pre>npx -y agentskin@latest</pre>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">02 / SURFACE</div>
        <div class="thesis-content">
            <h2>Three primary workflows</h2>
            <p><code>compress</code> compacts existing context, <code>fetch_optimized_data</code> fetches and prunes public resources, and <code>reduce</code> compacts command output.</p>
            <p>Compatibility tools remain available for direct JSON pruning, URL classification, ANSI stripping, token estimation, and optional prose denoising.</p>
        </div>
    </div>
</section>
`;

const SPEC_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">RULE / 01</div>
        <div class="thesis-content">
            <h2>Explicit signals are authoritative</h2>
            <p>When a caller or URL rule supplies fields to preserve, AgentSkin does not merge generic fallback keys such as <code>id</code>, <code>name</code>, or <code>url</code>. This prevents unrelated nested objects from leaking into compact context.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">RULE / 02</div>
        <div class="thesis-content">
            <h2>Fallbacks are conservative</h2>
            <p>Generic signal keys are used only when no explicit rule exists. Small or already-compact inputs may pass through unchanged.</p>
        </div>
    </div>
</section>
`;

const EXAMPLES_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">JSON</div>
        <div class="thesis-content">
            <h2>Compact structured context</h2>
            <pre>{ "input": "{...}", "url": "https://api.github.com/repos/acme/demo" }</pre>
            <p>Use the <code>compress</code> MCP tool. In auto mode, parseable JSON is sent through the semantic pruning pipeline.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">CLI</div>
        <div class="thesis-content">
            <h2>Compact terminal output</h2>
            <pre>{ "input": "...terminal output...", "command": "git status" }</pre>
            <p>Supplying <code>command</code> selects command-aware reduction through Tokenjuice.</p>
        </div>
    </div>
</section>
`;

const FAQ_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">FAQ / 01</div>
        <div class="thesis-content">
            <h2>Does AgentSkin promise one savings percentage?</h2>
            <p>No. Reduction depends on payload shape, selected signals, and command type. Release tests report measured examples, but fidelity is the release criterion.</p>
        </div>
    </div>
    <div class="thesis-item">
        <div class="thesis-number">FAQ / 02</div>
        <div class="thesis-content">
            <h2>Is Tokenjuice part of the source tree?</h2>
            <p>AgentSkin consumes Tokenjuice as a normal npm dependency for CLI reduction. It is credited under its MIT license.</p>
        </div>
    </div>
</section>
`;

const BASH_HOOK_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">SHELL</div>
        <div class="thesis-content">
            <h2>Optional terminal hook</h2>
            <p>The npm package includes an optional shell helper that routes command output through the same Tokenjuice reduction engine used by the MCP server.</p>
            <p>The MCP server does not require the hook.</p>
        </div>
    </div>
</section>
`;

const WHITEPAPER_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">THESIS</div>
        <div class="thesis-content">
            <h2>Context should be selected before inference.</h2>
            <p>Agent tools often return far more structure than a task requires. AgentSkin treats context selection as deterministic middleware: classify the source, preserve task-relevant fields, remove known noise, and expose what transformation occurred.</p>
            <p>Compression is not accepted as success when required information is lost.</p>
        </div>
    </div>
</section>
`;

const AUTONOMY_RATINGS_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">RATINGS / PREVIEW</div>
        <div class="thesis-content">
            <h2>Autonomy Ratings</h2>
            <p><strong>Autonomy Ratings</strong> is an independent ratings initiative for autonomous systems — measuring whether agents can be trusted with access, authority, tools, data, and money.</p>
            <blockquote>The independent rating agency for autonomous systems.</blockquote>
            <h3>Status</h3>
            <p>In development. Brand and metric names are working titles while the public rating methodology is prepared.</p>
        </div>
    </div>
</section>
`;

const SUITE_CONTENT = `
<section>
    <div class="thesis-item">
        <div class="thesis-number">ARCH / 01</div>
        <div class="thesis-content">
            <h2>One product, one runtime path</h2>
            <p>Semantic pruning is implemented by AgentSkin. Command-aware reduction is provided by the Tokenjuice npm dependency. The MCP and npm package use the same runtime path.</p>
            <pre>API / JSON / shell output
          |
          v
      AgentSkin
 classify -> preserve -> reduce
          |
          v
 compact task-relevant context</pre>
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
    return c.body('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://agentskin.dev/</loc></url><url><loc>https://agentskin.dev/suite</loc></url><url><loc>https://agentskin.dev/specification</loc></url><url><loc>https://agentskin.dev/examples</loc></url><url><loc>https://agentskin.dev/bash-hook</loc></url><url><loc>https://agentskin.dev/faq</loc></url><url><loc>https://agentskin.dev/whitepaper</loc></url><url><loc>https://agentskin.dev/autonomy-ratings</loc></url></urlset>');
});

app.get('/', (c) => c.html(LAYOUT(INTRO_CONTENT, 'introduction')));
app.get('/suite', (c) => c.html(LAYOUT(SUITE_CONTENT, 'suite')));
app.get('/specification', (c) => c.html(LAYOUT(SPEC_CONTENT, 'specification')));
app.get('/examples', (c) => c.html(LAYOUT(EXAMPLES_CONTENT, 'examples')));
app.get('/faq', (c) => c.html(LAYOUT(FAQ_CONTENT, 'faq')));
app.get('/bash-hook', (c) => c.html(LAYOUT(BASH_HOOK_CONTENT, 'bash-hook')));
app.get('/whitepaper', (c) => c.html(LAYOUT(WHITEPAPER_CONTENT, 'whitepaper')));
app.get('/autonomy-ratings', (c) => c.html(LAYOUT(AUTONOMY_RATINGS_CONTENT, 'autonomy-ratings')));
app.get('/arc', (c) => c.redirect('/autonomy-ratings', 302));

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
