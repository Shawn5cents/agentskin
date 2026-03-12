import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { recursive_prune, to_markdown_skin, analyze_compression } from '../backend/lib/skin-engine.js';
import crypto from 'crypto';

/**
 * AgentSkin: Cloudflare Hono Engine (v4.0)
 * Serverless optimized, secure, and production-ready.
 */

const app = new Hono();

// --- SECURITY HARDENING: Payload Limit Middleware ---
app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) { // 5MB Limit
        return c.json({ error: "PAYLOAD_TOO_LARGE", message: "Maximum payload size is 5MB to prevent JSON bomb attacks." }, 413);
    }
    await next();
});

// --- PERSISTENCE: Dual-Mode KV Store ---
const getUsageStore = (env) => ({
    async get(key) {
        if (env?.AGENTSKIN_KV) return JSON.parse(await env.AGENTSKIN_KV.get(key));
        return this._local.get(key);
    },
    async set(key, value) {
        if (env?.AGENTSKIN_KV) await env.AGENTSKIN_KV.put(key, JSON.stringify(value));
        else this._local.set(key, value);
    },
    async has(key) {
        if (env?.AGENTSKIN_KV) return (await env.AGENTSKIN_KV.get(key)) !== null;
        return this._local.has(key);
    },
    _local: new Map() // Fallback for local testing
});

// --- LOGGING: Serverless Dashboard Logs ---
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
        const storedLogs = await env.AGENTSKIN_KV.get("activity_logs");
        if (storedLogs) logs = JSON.parse(storedLogs);
    } else {
        logs = globalThis._localLogs || [];
    }

    logs.push(logEntry);
    if (logs.length > 50) logs.shift(); // Keep last 50

    if (env?.AGENTSKIN_KV) {
        await env.AGENTSKIN_KV.put("activity_logs", JSON.stringify(logs));
    } else {
        globalThis._localLogs = logs;
    }
};

// --- ROUTES: Discovery & Frontend ---
app.get('/', (c) => c.redirect('/v1/manifesto'));
app.get('/llms.txt', async (c) => c.text(await Bun.file('./docs/llms.txt').text())); // Assuming Bun/Node runtime for local
app.get('/v1/manifesto', async (c) => c.html(await Bun.file('./frontend/manifesto.html').text()));
app.get('/v1/supervisor', async (c) => c.html(await Bun.file('./frontend/index.html').text()));

// --- ROUTES: Polling Endpoint for Dashboard ---
app.get('/v1/logs', async (c) => {
    let logs = [];
    if (c.env?.AGENTSKIN_KV) {
        const storedLogs = await c.env.AGENTSKIN_KV.get("activity_logs");
        if (storedLogs) logs = JSON.parse(storedLogs);
    } else {
        logs = globalThis._localLogs || [];
    }
    return c.json(logs);
});

// --- ROUTES: Agent API ---

// 1. Register
app.post('/v1/auth/register', async (c) => {
    const body = await c.req.json();
    if (!body.agent_name) return c.json({ error: "Agent name required." }, 400);

    const agentId = `agent_${crypto.randomBytes(8).toString("hex")}`;
    const apiKey = `sk_${crypto.randomBytes(16).toString("hex")}`;

    const store = getUsageStore(c.env);
    await store.set(apiKey, { agentId, name: body.agent_name, credits: 50 });

    await logActivity(c.env, agentId, "agent_registered", 0);

    return c.json({
        message: "Agent Registered Successfully",
        agent_id: agentId,
        api_key: apiKey,
        quota: "50 free transforms",
        instructions: "Include 'X-Agent-Key' in headers."
    });
});

// 2. Transform
app.post('/v1/transform', async (c) => {
    const body = await c.req.json();
    const apiKey = c.req.header('x-agent-key');
    const store = getUsageStore(c.env);

    if (!apiKey || !(await store.has(apiKey))) {
        return c.json({ error: "Valid X-Agent-Key required." }, 401);
    }

    const agent = await store.get(apiKey);
    if (agent.credits <= 0) {
        return c.json({ error: "PAYMENT_REQUIRED", checkout_url: c.env?.STRIPE_CHECKOUT_URL || "https://buy.stripe.com/test_..." }, 402);
    }

    try {
        const pruned = recursive_prune(body.data, body.signals || []);
        const rawSize = JSON.stringify(body.data).length;
        const skin = to_markdown_skin(pruned, body.title || "AUTO_SKIN", rawSize);
        const metrics = analyze_compression(body.data, skin);

        agent.credits -= 1;
        await store.set(apiKey, agent);

        await logActivity(c.env, agent.agentId, "universal_transform", metrics.platform_fee);

        return c.json({ skin, metrics, remaining_credits: agent.credits });
    } catch (error) {
        return c.json({ error: "Transform failed or JSON structure invalid." }, 500);
    }
});

// 3. Proxy
app.all('/v1/proxy/*', async (c) => {
    const targetUrl = c.req.path.replace('/v1/proxy/', '');
    const apiKey = c.req.header('x-agent-key');
    const store = getUsageStore(c.env);

    if (!apiKey || !(await store.has(apiKey))) {
        return c.json({ error: "API Key Required." }, 401);
    }

    try {
        const fetchOptions = {
            method: c.req.method,
            headers: { ...c.req.header(), host: new URL(targetUrl).host }
        };
        
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
             fetchOptions.body = await c.req.text();
        }

        const response = await fetch(targetUrl, fetchOptions);
        const rawData = await response.json();
        
        const signals = c.req.query('signals') ? c.req.query('signals').split(',') : [];
        const pruned = recursive_prune(rawData, signals);
        const rawSize = JSON.stringify(rawData).length;
        const skin = to_markdown_skin(pruned, targetUrl, rawSize);
        const metrics = analyze_compression(rawData, skin);

        return c.json({ skin, metrics });
    } catch (error) {
        return c.json({ error: `Proxy failed: ${error.message}` }, 500);
    }
});

export default app;
