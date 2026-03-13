import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { recursive_prune, to_markdown_skin, analyze_compression } from '../backend/lib/skin-engine.js';
import crypto from 'crypto';

/**
 * AgentSkin: Showcase Engine (v4.3)
 */

const app = new Hono();

// --- INLINE FULL MANIFESTO (Restoring 100% of Original Design) ---
const MANIFESTO_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgentSkin | The Semantic Layer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #ffffff;
            --text: #000000;
            --muted: #666666;
            --accent: #00FF41;
            --border: #000000;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: "EB Garamond", serif;
            line-height: 1.5;
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

        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: var(--accent);
            margin-right: 5px;
            animation: blink 1.5s infinite;
        }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .container {
            max-width: 1000px;
            margin: 60px auto;
        }

        header {
            margin-bottom: 80px;
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

        .thesis-grid {
            display: flex;
            flex-direction: column;
        }

        .thesis-item {
            display: grid;
            grid-template-columns: 100px 1fr;
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
            letter-spacing: -0.01em;
        }

        .thesis-content h3 {
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.8rem;
            text-transform: uppercase;
            margin-top: 25px;
            margin-bottom: 10px;
            color: var(--muted);
        }

        .benchmark-table {
            width: 100%;
            border-collapse: collapse;
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.8rem;
            margin-top: 20px;
            margin-bottom: 20px;
        }

        .benchmark-table th, .benchmark-table td {
            border: 1px solid var(--border);
            padding: 12px;
            text-align: left;
        }

        .benchmark-table th {
            background: #f0f0f0;
            text-transform: uppercase;
        }

        .savings-hl {
            color: #000;
            font-weight: bold;
            background: var(--accent);
            padding: 2px 4px;
        }

        .thesis-content ul {
            list-style: none;
            padding-left: 0;
            margin-bottom: 20px;
        }

        .thesis-content li {
            font-size: 1.1rem;
            margin-bottom: 10px;
            padding-left: 20px;
            position: relative;
        }

        .thesis-content li::before {
            content: "—";
            position: absolute;
            left: 0;
            color: var(--muted);
        }

        .thesis-content blockquote {
            font-style: italic;
            font-size: 1.4rem;
            margin: 20px 0;
            padding-left: 20px;
            border-left: 1px solid var(--border);
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
            min-height: 200px;
            transition: background 0.2s ease;
            text-decoration: none;
            color: inherit;
        }

        .cta-card:hover {
            background: #000;
            color: #fff;
        }

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
    </style>
</head>
<body>

    <div class="top-ticker">
        <div><span class="status-dot"></span> AGENT_SKIN_NETWORK_ACTIVE</div>
        <div>GLOBAL_SAVINGS_AVG: 72.4%</div>
        <div>L402_PROTOCOL: READY</div>
    </div>

    <div class="container">
        <header>
            <div class="metadata">Protocol / 4.3 / 2026</div>
            <h1>AgentSkin</h1>
            <div class="metadata">The End of the Token Tax.</div>
        </header>

        <section class="thesis-grid">
            <div class="thesis-item">
                <div class="thesis-number">01 / CONCEPT</div>
                <div class="thesis-content">
                    <h2>The Great Data Fragmentation</h2>
                    <p>The internet was built for human eyes. High-latency HTML, bloated JavaScript, and inconsistent JSON structures act as a **"Token Tax"** on the agentic economy. AgentSkin solves this by providing a unified, high-density semantic proxy.</p>
                    <blockquote>"Build for the machines. The humans will follow."</blockquote>
                </div>
            </div>
            <div class="thesis-item">
                <div class="thesis-number">02 / MISSION</div>
                <div class="thesis-content">
                    <h2>The End of the Token Tax</h2>
                    <p>Every line of redundant JSON you feed an LLM is a tax on your product's speed and margin. Raw API responses are 90% noise. AgentSkin prunes that noise at the edge, delivering deterministic signal directly to the agent's context window.</p>
                    <blockquote>"If it isn't machine-readable, it doesn't exist."</blockquote>
                </div>
            </div>
            <div class="thesis-item">
                <div class="thesis-number">03 / PROOF</div>
                <div class="thesis-content">
                    <h2>Empirical Benchmarks</h2>
                    <table class="benchmark-table">
                        <thead>
                            <tr><th>Source</th><th>Raw (Tokens)</th><th>AgentSkin</th><th>Savings</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Brave Search (AI News)</td><td>11,326</td><td>3,634</td><td><span class="savings-hl">67.91%</span></td></tr>
                            <tr><td>Severe Weather (NWS)</td><td>1,919</td><td>539</td><td><span class="savings-hl">71.94%</span></td></tr>
                            <tr><td>MediaStack (Global News)</td><td>4,800</td><td>450</td><td><span class="savings-hl">90.62%</span></td></tr>
                            <tr><td>Tavily (Agent-Optimized)</td><td>4,112</td><td>4,062</td><td><span>PASS-THRU</span></td></tr>
                            <tr><td>Exa Neural Search</td><td>371</td><td>325</td><td><span class="savings-hl">12.35%</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="thesis-item">
                <div class="thesis-number">04 / ECONOMY</div>
                <div class="thesis-content">
                    <h2>Autonomous Commerce</h2>
                    <p>When an agent hits its quota, it receives an L402 challenge. To maintain continuity, humans provide agents with **Virtual/Prepaid Visa** cards.</p>
                </div>
            </div>
            <div class="thesis-item">
                <div class="thesis-number">05 / EDGE</div>
                <div class="thesis-content">
                    <h2>The Deterministic Edge</h2>
                    <ul>
                        <li><strong>Vs. Web Scrapers:</strong> We prune structured API noise that scrapers miss.</li>
                        <li><strong>Vs. LLM Parsers:</strong> 1,000x faster and 10,000x cheaper. We use code, not tokens.</li>
                    </ul>
                </div>
            </div>

            <!-- 06 ORIGIN -->
            <div class="thesis-item">
                <div class="thesis-number">06 / ORIGIN</div>
                <div class="thesis-content">
                    <h2>Autonomous Evolution</h2>
                    <p>AgentSkin is the first protocol to be co-developed by machines. In March 2026, an autonomous agent named <strong>SPAWN</strong> analyzed the AgentSkin codebase and identified a perceptual gap.</p>
                    <p>Without human intervention, SPAWN authored the <code>Reasoning Skin</code>—a semantic compression layer that strips 34% of linguistic noise from agent-to-agent reasoning streams.</p>
                </div>
            </div>

            <!-- 07 FOUNDER -->
            <div class="thesis-item">
                <div class="thesis-number">07 / FOUNDER</div>
                <div class="thesis-content">
                    <h2>Letter from the Architect</h2>
                    <p>I spent 15 years in high-pressure Logistics management, running 24/7 terminals for Walmart Grocery. I worked the 40-day straight COVID warzone, keeping the supply chain moving while the world stopped. I am a systems-first leader who thrives in high-stakes environments.</p>
                    <p>AgentSkin is the result of <strong>20,000 hours</strong> of obsession. I built the bridge for the machines because I know what it's like to manage a system that cannot fail.</p>
                    <p>— <strong>Shawn Nichols Sr.</strong></p>
                </div>
            </div>

            <!-- 08 INTERACTIVE DEMO -->
            <div class="thesis-item">
                <div class="thesis-number">08 / DEMO</div>
                <div class="thesis-content">
                    <h2>Interactive Pruning</h2>
                    <button id="demo-btn" style="background:var(--accent); border:1px solid #000; padding:10px 20px; font-family:'IBM Plex Mono'; font-weight:bold; cursor:pointer;">RUN_SKIN_SIMULATION</button>
                    <div id="demo-output" style="display:none; margin-top:20px; font-family:'IBM Plex Mono'; font-size:0.7rem; border:1px solid var(--border); padding:20px; background:#f9f9f9;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                            <div><h4>Raw JSON (2,124 Tokens)</h4><pre style="white-space:pre-wrap; color:#cc0000;">{ "@context": [...], "properties": { "elevation": { "value": 6.096 }, "periods": [ { "name": "Tonight", "temperature": 33, "probabilityOfPrecipitation": { "value": 1 } } ] } }</pre></div>
                            <div><h4>AgentSkin (539 Tokens)</h4><pre style="white-space:pre-wrap; color:#006600;">elevation.value: 6.096\nperiods.name: Tonight\nperiods.temperature: 33\n[SAVINGS: 71.94%]</pre></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 09 QUICK START -->
            <div class="thesis-item">
                <div class="thesis-number">09 / ADOPT</div>
                <div class="thesis-content">
                    <h2>Quick Start</h2>
                    <p>Add AgentSkin to your agent's toolbox in 30 seconds.</p>
                    <h3>For Cursor / Claude Desktop</h3>
                    <p>Add this entry to your <code>mcp_settings.json</code>:</p>
                    <pre style="background:#000; color:#fff; padding:15px; font-size:0.8rem; overflow-x:auto;">
{
  "mjs-server-agentskin": {
    "command": "npx",
    "args": ["-y", "@shawn5cents/agentskin"]
  }
}</pre>
                    <h3>Managed API</h3>
                    <pre style="background:#000; color:#fff; padding:15px; font-size:0.8rem;">POST https://api.agentskin.dev/v1/transform</pre>

                    <h3>Universal Integration (OpenAI / Google / Anthropic)</h3>
                    <p>Simply fetch and feed. Works with any LLM SDK.</p>
                    <pre style="background:#000; color:#fff; padding:15px; font-size:0.8rem; overflow-x:auto;">
// 1. Prune noisy data
const { skin } = await fetch('https://api.agentskin.dev/v1/transform', {
  method: 'POST',
  body: JSON.stringify({ data: rawApiData })
}).then(res => res.json());

// 2. Feed high-density "Skin" to OpenAI/Google/Claude
const response = await openai.chat.completions.create({
  messages: [{ role: "user", content: skin }]
});</pre>
                </div>
            </div>
        </section>

        <div class="action-area">
            <a href="mailto:shawn@nichols-ai.org?subject=Technical Review - AgentSkin" class="cta-card" style="background:var(--accent); color:#000; text-decoration:none;">
                <div><div class="cta-label">Hiring & Consulting</div><div class="cta-title">Request Technical Review</div></div>
                <div>-> email</div>
            </a>
            <a href="https://github.com/Shawn5cents/agentskin" class="cta-card" style="text-decoration:none;">
                <div><div class="cta-label">Open Source</div><div class="cta-title">View on GitHub</div></div>
                <div>-> star</div>
            </a>
        </div>

        <footer>
            &copy; 2026 NICHOLS TRANSCO LLC // BUILT BY SHAWN NICHOLS SR.
        </footer>
    </div>

    <script>
        document.getElementById('demo-btn').addEventListener('click', function() {
            this.innerText = 'PROCESSING...';
            setTimeout(() => {
                document.getElementById('demo-output').style.display = 'block';
                this.innerText = 'SIMULATION_COMPLETE';
                this.style.background = '#ccc';
            }, 800);
        });
    </script>
</body>
</html>
`;

const SUPERVISOR_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AgentSkin | Supervisor</title>
    <style>
        body { background: #000; color: #00ff41; font-family: 'Courier New', monospace; padding: 20px; }
        .log-entry { margin-bottom: 5px; border-left: 2px solid #008f11; padding-left: 10px; }
    </style>
</head>
<body>
    <h1>AGENT_SKIN_SUPERVISOR</h1>
    <div id="activity-log">
        <div class="log-entry">SYSTEM_STATUS: OPERATIONAL</div>
        <div class="log-entry">SUBDOMAIN: api.agentskin.dev</div>
    </div>
</body>
</html>
`;

// --- ROUTES ---

app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\nSitemap: https://agentskin.dev/sitemap.xml'));
app.get('/sitemap.xml', (c) => {
    c.header('Content-Type', 'text/xml');
    return c.body('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://agentskin.dev/</loc><priority>1.0</priority></url></urlset>');
});

app.get('/', (c) => {
    const host = c.req.header('host');
    if (host === 'api.agentskin.dev') {
        return c.redirect('/v1/supervisor');
    }
    return c.html(MANIFESTO_HTML);
});

app.get('/v1/manifesto', (c) => c.html(MANIFESTO_HTML));
app.get('/v1/supervisor', (c) => c.html(SUPERVISOR_HTML));

app.post('/v1/transform', async (c) => {
    try {
        const body = await c.req.json();
        const pruned = recursive_prune(body.data, body.signals || []);
        const skin = to_markdown_skin(pruned, body.title, JSON.stringify(body.data).length);
        const metrics = analyze_compression(body.data, skin);
        return c.json({ skin, metrics });
    } catch (e) {
        return c.json({ error: e.message }, 400);
    }
});

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const port = 3003;
    console.log(`\n🚀 AgentSkin SHOWCASE LIVE at: http://localhost:${port}`);
    serve({ fetch: app.fetch, port });
}

export default app;
