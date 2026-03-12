import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { recursive_prune, to_markdown_skin, analyze_compression } from '../backend/lib/skin-engine.js';
import crypto from 'crypto';

/**
 * AgentSkin: Universal Hono Engine (v4.1)
 * Optimized for Cloudflare Workers, Node, and Bun.
 */

const app = new Hono();

// --- SECURITY: Payload Limit ---
app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        return c.json({ error: "PAYLOAD_TOO_LARGE" }, 413);
    }
    await next();
});

// --- PERSISTENCE: Dual-Mode Store ---
const getUsageStore = (env) => ({
    async get(key) {
        if (env?.AGENTSKIN_KV) return JSON.parse(await env.AGENTSKIN_KV.get(key));
        return globalThis._localStore?.get(key);
    },
    async set(key, value) {
        if (env?.AGENTSKIN_KV) await env.AGENTSKIN_KV.put(key, JSON.stringify(value));
        else {
            if (!globalThis._localStore) globalThis._localStore = new Map();
            globalThis._localStore.set(key, value);
        }
    },
    async has(key) {
        if (env?.AGENTSKIN_KV) return (await env.AGENTSKIN_KV.get(key)) !== null;
        return globalThis._localStore?.has(key) || false;
    }
});

// --- LOGGING ---
const logActivity = async (env, agentId, action, savings) => {
    const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        agent: agentId,
        action,
        savings
    };
    let logs = [];
    if (env?.AGENTSKIN_KV) {
        const stored = await env.AGENTSKIN_KV.get("activity_logs");
        if (stored) logs = JSON.parse(stored);
    } else {
        logs = globalThis._localLogs || [];
    }
    logs.push(logEntry);
    if (logs.length > 50) logs.shift();
    if (env?.AGENTSKIN_KV) await env.AGENTSKIN_KV.put("activity_logs", JSON.stringify(logs));
    else globalThis._localLogs = logs;
};

// --- ROUTES: Discovery & Static ---
app.get('/', (c) => c.redirect('/v1/manifesto'));

/**
 * MACHINE HEARTBEAT (Agent Discovery)
 * GET /v1/status
 */
app.get('/v1/status', (c) => {
    return c.json({
        status: "OPERATIONAL",
        protocol: "AgentSkin",
        version: "4.1",
        capabilities: ["universal_transform", "proxy", "mcp"],
        discovery: "https://agentskin.dev/llms.txt",
        owner: "Nichols Transco LLC"
    });
});

// We'll serve these as simple JSON or raw text for now to ensure 100% Worker compatibility
app.get('/llms.txt', (c) => c.text("AgentSkin: The Universal Semantic Layer. Access /v1/manifesto for human docs."));

app.get('/v1/manifesto', (c) => {
    return c.html("<h1>AgentSkin Manifesto</h1><p>Visit /v1/supervisor for the live dashboard.</p><p>Built by Nichols Transco LLC.</p>");
});

app.get('/v1/logs', async (c) => {
    let logs = [];
    if (c.env?.AGENTSKIN_KV) {
        const stored = await c.env.AGENTSKIN_KV.get("activity_logs");
        if (stored) logs = JSON.parse(stored);
    } else {
        logs = globalThis._localLogs || [];
    }
    return c.json(logs);
});

// --- ROUTES: API ---

app.post('/v1/auth/register', async (c) => {
    const body = await c.req.json();
    const agentId = `agent_${crypto.randomBytes(4).toString("hex")}`;
    const apiKey = `sk_${crypto.randomBytes(8).toString("hex")}`;
    const store = getUsageStore(c.env);
    await store.set(apiKey, { agentId, credits: 50 });
    return c.json({ agent_id: agentId, api_key: apiKey, message: "Registered." });
});

app.post('/v1/transform', async (c) => {
    const body = await c.req.json();
    const apiKey = c.req.header('x-agent-key');
    const store = getUsageStore(c.env);
    if (!apiKey || !(await store.has(apiKey))) return c.json({ error: "Unauthorized" }, 401);

    const agent = await store.get(apiKey);
    const pruned = recursive_prune(body.data, body.signals || []);
    const skin = to_markdown_skin(pruned, body.title, JSON.stringify(body.data).length);
    const metrics = analyze_compression(body.data, skin);

    await logActivity(c.env, agent.agentId, "transform", metrics.platform_fee);
    return c.json({ skin, metrics });
});

// Start server if running in Node environment
if (typeof process !== 'undefined') {
    const port = process.env.PORT || 3001;
    console.log(`AgentSkin Backend running on port ${port}`);
    serve({ fetch: app.fetch, port: Number(port) });
}

export default app;
