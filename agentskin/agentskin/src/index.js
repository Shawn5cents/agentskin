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
        --bg: #f6f6f1;
        --paper: #ffffff;
        --text: #050505;
        --muted: #666660;
        --soft: #ecece6;
        --border: #050505;
        --shadow-x: 7px;
        --shadow-y: 7px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
        background:
            linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px),
            var(--bg);
        background-size: 28px 28px;
        color: var(--text);
        font-family: "EB Garamond", serif;
        line-height: 1.58;
        -webkit-font-smoothing: antialiased;
        padding: 0 20px;
    }

    a { color: inherit; }

    .top-ticker {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border-bottom: 1px solid var(--border);
        padding: 10px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        background: rgba(246,246,241,0.94);
        backdrop-filter: blur(12px);
        z-index: 100;
    }

    .top-ticker a {
        text-decoration: none;
        margin-left: 18px;
        padding: 3px 6px;
    }

    .top-ticker a:hover,
    .top-ticker a:focus-visible {
        background: var(--text);
        color: var(--paper);
        outline: none;
    }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #000;
        margin-right: 7px;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
    }

    .container {
        max-width: 980px;
        margin: 64px auto;
    }

    header {
        margin-bottom: 48px;
        border-bottom: 1px solid var(--border);
        padding: 0 0 28px;
    }

    h1 {
        font-size: clamp(3.8rem, 9vw, 7.6rem);
        font-weight: 500;
        letter-spacing: -0.065em;
        line-height: 0.86;
        margin: 8px 0 20px;
    }

    .header-line {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: end;
    }

    .header-deck {
        max-width: 640px;
        font-size: 1.2rem;
        line-height: 1.45;
    }

    .metadata {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.75rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .proof-chip {
        flex: 0 0 auto;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        border: 1px solid var(--border);
        background: var(--paper);
        padding: 9px 11px;
        white-space: nowrap;
    }

    section { margin-bottom: 68px; }

    .thesis-item {
        display: grid;
        grid-template-columns: 124px 1fr;
        border: 1px solid var(--border);
        padding: 34px;
        gap: 34px;
        margin-bottom: 22px;
        background: var(--paper);
    }

    .thesis-item.plain {
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
        background: transparent;
        margin-bottom: 0;
    }

    [data-underlay] {
        --shadow-x: 7px;
        --shadow-y: 7px;
        box-shadow: var(--shadow-x) var(--shadow-y) 0 #000;
        transition: box-shadow 85ms linear, transform 140ms ease;
        will-change: box-shadow;
    }

    [data-underlay]:hover { transform: translate(-1px, -1px); }

    .thesis-number {
        font-family: "IBM Plex Mono", monospace;
        font-weight: 600;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .thesis-content h2 {
        font-size: clamp(1.8rem, 4vw, 2.65rem);
        font-weight: 600;
        letter-spacing: -0.025em;
        line-height: 1.02;
        margin-bottom: 16px;
    }

    .thesis-content p + p { margin-top: 12px; }

    .thesis-content h3 {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 25px;
        margin-bottom: 10px;
    }

    blockquote {
        font-style: italic;
        font-size: clamp(1.45rem, 4vw, 2.1rem);
        line-height: 1.2;
        margin: 25px 0;
        padding-left: 20px;
        border-left: 4px solid var(--border);
    }

    pre {
        background: #050505;
        color: #f8f8f2;
        padding: 18px 20px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.82rem;
        overflow-x: auto;
        margin: 18px 0;
        border: 1px solid var(--border);
    }

    code {
        font-family: "IBM Plex Mono", monospace;
        background: #eeeeea;
        padding: 2px 5px;
        font-size: 0.88em;
    }

    .tool-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 20px;
    }

    .tool-pill {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.72rem;
        border: 1px solid var(--border);
        padding: 6px 9px;
        background: var(--paper);
    }

    .network {
        border-top: 4px solid var(--border);
        padding-top: 28px;
        margin-top: 80px;
    }

    .network-head {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 24px;
        margin-bottom: 24px;
    }

    .network-head h2 {
        font-size: clamp(2rem, 5vw, 3.4rem);
        font-weight: 500;
        line-height: 0.95;
        letter-spacing: -0.04em;
    }

    .network-head p { max-width: 480px; color: var(--muted); }

    .network-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
    }

    .network-card,
    .cta-card {
        position: relative;
        border: 1px solid var(--border);
        background: var(--paper);
        padding: 24px;
        min-height: 190px;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .network-card h3,
    .cta-card h2 {
        font-size: 1.55rem;
        line-height: 1;
        margin: 8px 0 12px;
    }

    .network-card p { color: var(--muted); line-height: 1.35; }

    .network-card .out,
    .cta-card .out {
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 26px;
    }

    .network-card:hover .out,
    .cta-card:hover .out { text-decoration: underline; text-underline-offset: 3px; }

    .action-area {
        margin-top: 70px;
        border-top: 1px solid var(--border);
        padding-top: 28px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
    }

    footer {
        margin: 90px 0 36px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.67rem;
        text-transform: uppercase;
        color: var(--muted);
        border-top: 1px solid var(--border);
        padding-top: 20px;
    }

    .footer-row {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
    }

    .footer-links { display: flex; gap: 14px; flex-wrap: wrap; }
    .footer-links a { text-decoration: none; }
    .footer-links a:hover { color: #000; text-decoration: underline; text-underline-offset: 3px; }

    .nav-tabs {
        display: flex;
        gap: 1px;
        background: var(--border);
        border: 1px solid var(--border);
        margin-bottom: 42px;
        overflow-x: auto;
        scrollbar-width: thin;
    }

    .nav-tab {
        flex: 1 0 auto;
        background: var(--paper);
        padding: 13px 14px;
        text-align: center;
        font-family: "IBM Plex Mono", monospace;
        font-size: 0.7rem;
        text-decoration: none;
        color: var(--text);
        text-transform: uppercase;
        white-space: nowrap;
    }

    .nav-tab:hover { background: var(--soft); }
    .nav-tab.active { background: var(--text); color: var(--paper); }

    @media (max-width: 760px) {
        body { padding: 0 13px; background-size: 22px 22px; }
        .top-ticker { font-size: 0.6rem; }
        .top-ticker .ticker-mid { display: none; }
        .top-ticker a { margin-left: 8px; }
        .container { margin: 42px auto; }
        header { margin-bottom: 32px; }
        h1 { font-size: clamp(4rem, 22vw, 6.5rem); }
        .header-line { display: block; }
        .proof-chip { display: inline-block; margin-top: 18px; }
        .nav-tabs { margin-bottom: 32px; }
        .nav-tab { flex: 0 0 auto; }
        .thesis-item { grid-template-columns: 1fr; padding: 24px 20px; gap: 12px; }
        .network-head { display: block; }
        .network-head p { margin-top: 12px; }
        .network-grid, .action-area { grid-template-columns: 1fr; }
        .network-card, .cta-card { min-height: 155px; }
        [data-underlay] { --shadow-x: 5px; --shadow-y: 5px; }
        footer { margin-top: 70px; }
    }

    @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        [data-underlay] { transition: none; }
    }
</style>
`;
const LAYOUT = (content, activeTab = 'introduction') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="AgentSkin is fidelity-first context middleware for AI agents. Remove tool noise before it reaches model context.">
    <title>AgentSkin | Clean Context Before Inference</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
    ${COMMON_STYLE}
</head>
<body>
    <div class="top-ticker">
        <div><span class="status-dot"></span> AGENTSKIN 5.1.0 / NPM LATEST</div>
        <div class="ticker-mid">FIDELITY-FIRST CONTEXT MIDDLEWARE</div>
        <div><a href="https://nicholsai.com" target="_blank" rel="noopener">NICHOLS AI ↗</a></div>
    </div>

    <div class="container">
        <header>
            <div class="metadata">Open-source context middleware / 2026</div>
            <h1>AgentSkin</h1>
            <div class="header-line">
                <p class="header-deck">Clean the context before it hits the model. AgentSkin keeps task-relevant facts and strips low-value API, JSON, and terminal noise.</p>
                <div class="proof-chip">npm i agentskin@5.1.0</div>
            </div>
        </header>

        <nav class="nav-tabs" aria-label="AgentSkin documentation">
            <a href="/" class="nav-tab ${activeTab === 'introduction' ? 'active' : ''}">Overview</a>
            <a href="/suite" class="nav-tab ${activeTab === 'suite' ? 'active' : ''}">Architecture</a>
            <a href="/specification" class="nav-tab ${activeTab === 'specification' ? 'active' : ''}">Rules</a>
            <a href="/examples" class="nav-tab ${activeTab === 'examples' ? 'active' : ''}">Examples</a>
            <a href="/bash-hook" class="nav-tab ${activeTab === 'bash-hook' ? 'active' : ''}">Shell Hook</a>
            <a href="/faq" class="nav-tab ${activeTab === 'faq' ? 'active' : ''}">FAQ</a>
            <a href="/whitepaper" class="nav-tab ${activeTab === 'whitepaper' ? 'active' : ''}">Thesis</a>
            <a href="https://github.com/Shawn5cents/agentskin" class="nav-tab" target="_blank" rel="noopener">GitHub ↗</a>
        </nav>

        ${content}

        <section class="network" aria-labelledby="network-title">
            <div class="network-head">
                <div>
                    <div class="metadata">Built in the same shop</div>
                    <h2 id="network-title">Nichols AI network</h2>
                </div>
                <p>Other public products and experiments from Nichols AI. AgentSkin is the context layer; these are the places it lives beside.</p>
            </div>
            <div class="network-grid">
                <a href="https://nicholsai.com" target="_blank" rel="noopener" class="network-card" data-underlay>
                    <div>
                        <div class="metadata">Company / Lab</div>
                        <h3>Nichols AI</h3>
                        <p>Applied AI systems, agent infrastructure, production software, and business automation.</p>
                    </div>
                    <div class="out">nicholsai.com ↗</div>
                </a>
                <a href="https://link2note.com" target="_blank" rel="noopener" class="network-card" data-underlay>
                    <div>
                        <div class="metadata">Product</div>
                        <h3>Link2Note</h3>
                        <p>Turn YouTube videos, webpages, and documents into clean notes without the copy-paste mess.</p>
                    </div>
                    <div class="out">link2note.com ↗</div>
                </a>
                <a href="https://github.com/Shawn5cents/grok-build-legion-edition" target="_blank" rel="noopener" class="network-card" data-underlay>
                    <div>
                        <div class="metadata">Open Source</div>
                        <h3>Grok Build — Legion Edition</h3>
                        <p>A public build experiment from the Nichols AI lab, available directly on GitHub.</p>
                    </div>
                    <div class="out">open repository ↗</div>
                </a>
            </div>
        </section>

        <div class="action-area">
            <a href="https://github.com/Shawn5cents/agentskin" class="cta-card" data-underlay target="_blank" rel="noopener">
                <div>
                    <div class="metadata">Source</div>
                    <h2>Read the code</h2>
                    <p>Rules, MCP server, tests, and release history.</p>
                </div>
                <div class="out">GitHub repository ↗</div>
            </a>
            <a href="https://www.npmjs.com/package/agentskin" class="cta-card" data-underlay target="_blank" rel="noopener">
                <div>
                    <div class="metadata">Package</div>
                    <h2>Install AgentSkin</h2>
                    <p>Current release: 5.1.0. Run it directly with npx or add it to an MCP client.</p>
                </div>
                <div class="out">npm registry ↗</div>
            </a>
        </div>

        <footer>
            <div class="footer-row">
                <div>&copy; 2026 Nichols Transco LLC / AgentSkin</div>
                <div class="footer-links">
                    <a href="https://nicholsai.com" target="_blank" rel="noopener">Nichols AI ↗</a>
                    <a href="https://link2note.com" target="_blank" rel="noopener">Link2Note ↗</a>
                    <a href="https://github.com/Shawn5cents/grok-build-legion-edition" target="_blank" rel="noopener">Legion ↗</a>
                    <a href="https://github.com/vincentkoc/tokenjuice" target="_blank" rel="noopener">Tokenjuice ↗</a>
                </div>
            </div>
        </footer>
    </div>

    <script>
    (() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        document.querySelectorAll('[data-underlay]').forEach((el) => {
            const reset = () => {
                el.style.setProperty('--shadow-x', '7px');
                el.style.setProperty('--shadow-y', '7px');
            };

            el.addEventListener('pointermove', (event) => {
                if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
                const rect = el.getBoundingClientRect();
                const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
                el.style.setProperty('--shadow-x', Math.round(nx * 13) + 'px');
                el.style.setProperty('--shadow-y', Math.round(ny * 13) + 'px');
            });

            el.addEventListener('pointerleave', reset);
            reset();
        });
    })();
    </script>
</body>
</html>
`;
// --- PAGES ---

const INTRO_CONTENT = `
<section>
    <div class="thesis-item" data-underlay>
        <div class="thesis-number">01 / Why</div>
        <div class="thesis-content">
            <h2>Your model should not pay attention to everything your tools return.</h2>
            <p>APIs, CLIs, and browser tools are designed to be complete, not context-efficient. AgentSkin sits in the middle and keeps the facts the task actually needs.</p>
            <blockquote>Preserve the signal. Cut the payload.</blockquote>
            <h3>Install</h3>
            <pre>npx -y agentskin@latest</pre>
        </div>
    </div>
    <div class="thesis-item plain">
        <div class="thesis-number">02 / One front door</div>
        <div class="thesis-content">
            <h2>Start with <code>compress</code>.</h2>
            <p>Give it existing context. AgentSkin detects JSON, command output, or plain text and chooses the appropriate safe reduction path. Use the specialized tools only when you want direct control.</p>
            <div class="tool-row" aria-label="Primary AgentSkin tools">
                <span class="tool-pill">compress</span>
                <span class="tool-pill">fetch_optimized_data</span>
                <span class="tool-pill">reduce</span>
            </div>
        </div>
    </div>
    <div class="thesis-item" data-underlay>
        <div class="thesis-number">03 / Rule</div>
        <div class="thesis-content">
            <h2>Fidelity is the gate. Compression is the score.</h2>
            <p>Explicit signals and URL-specific rules are authoritative. AgentSkin does not keep unrelated nested fields merely because they happen to be named <code>id</code>, <code>name</code>, or <code>url</code>.</p>
            <p>If the smaller result loses required information, it is not a successful reduction.</p>
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
