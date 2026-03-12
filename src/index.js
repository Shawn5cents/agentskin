import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { recursive_prune, to_markdown_skin, analyze_compression } from '../backend/lib/skin-engine.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AgentSkin: Showcase Engine (v4.3)
 * Port 3003 // Local File Serving Enabled
 */

const app = new Hono();

// Helper to serve local files
const serveFile = (filePath, contentType) => async (c) => {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        c.header('Content-Type', contentType);
        return c.body(content);
    } catch (e) {
        return c.text(`File not found: ${filePath}`, 404);
    }
};

// --- SECURITY: Payload Limit ---
app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        return c.json({ error: "PAYLOAD_TOO_LARGE" }, 413);
    }
    await next();
});

// --- ROUTES: Human Entrance ---
app.get('/', (c) => c.redirect('/v1/manifesto'));
app.get('/v1/manifesto', serveFile('frontend/manifesto.html', 'text/html'));
app.get('/v1/supervisor', serveFile('frontend/index.html', 'text/html'));
app.get('/llms.txt', serveFile('docs/llms.txt', 'text/plain'));
app.get('/docs/PRIVACY.md', serveFile('docs/PRIVACY.md', 'text/markdown'));

// --- LOGS & STATS ---
app.get('/v1/logs', async (c) => {
    return c.json(globalThis._localLogs || []);
});

// --- API: Registration ---
app.post('/v1/auth/register', async (c) => {
    const agentId = `agent_${crypto.randomBytes(4).toString("hex")}`;
    const apiKey = `sk_${crypto.randomBytes(8).toString("hex")}`;
    return c.json({ agent_id: agentId, api_key: apiKey, message: "Showcase Mode: Active" });
});

// --- API: Transform ---
app.post('/v1/transform', async (c) => {
    const body = await c.req.json();
    const pruned = recursive_prune(body.data, body.signals || []);
    const skin = to_markdown_skin(pruned, body.title, JSON.stringify(body.data).length);
    const metrics = analyze_compression(body.data, skin);
    return c.json({ skin, metrics });
});

// --- START SERVER ---
const port = 3003;
console.log(`\n🚀 AgentSkin SHOWCASE LIVE at: http://localhost:${port}`);
console.log(`📖 Manifesto: http://localhost:${port}/v1/manifesto`);
console.log(`📊 Dashboard: http://localhost:${port}/v1/supervisor\n`);

serve({ fetch: app.fetch, port });

export default app;
