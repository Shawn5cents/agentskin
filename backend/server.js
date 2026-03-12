import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import unifiedRouter from "./routes/unified.js";
import { register_sse_client } from "./lib/events.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. "Agent-Only" Root (No-Human Policy)
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.status(403).send(`
  [ERROR: AGENT_REQUIRED]
  AgentSkin is optimized for autonomous machines.
  Access via MCP or REST (POST /v1/skin).
  Discovery: https://agentskin.dev/llms.txt
  `);
});

// 2. Private Supervisor Dashboard (Internal Use Only)
app.get("/v1/supervisor", (req, res) => {
  // In production, add basic auth or IP filtering here
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// 2b. Human Manifesto (The "Why")
app.get("/v1/manifesto", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/manifesto.html"));
});

// 3. SSE Stream for Supervisor Dashboard
app.get("/v1/events", register_sse_client);

// 4. Unified Skin & Billing Router
app.use("/v1", unifiedRouter);

// 5. Static Assets for Supervisor (Private)
app.use("/v1/supervisor", express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AgentSkin Backend (v2.4) running on port ${PORT}`);
  console.log(`Supervisor Dashboard available at: http://localhost:${PORT}/v1/supervisor`);
});
