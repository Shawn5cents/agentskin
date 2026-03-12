import express from "express";
import { normalize_weather, normalize_search, normalize_generic } from "../engine.js";
import { get_news_mediastack } from "../connectors/mediastack.js";
import { search_serper } from "../connectors/serper.js";
import { broadcast_activity } from "../lib/events.js";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// Simple Free-Tier Cache (In-Memory)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 Minutes

/**
 * A2A Onboarding (Moltbook Style)
 * POST /v1/onboard
 */
router.post("/onboard", async (req, res) => {
  const { agent_id } = req.body;
  
  if (!agent_id) {
    return res.status(400).json({ error: "Missing 'agent_id' for A2A registration." });
  }

  const sessionKey = crypto.randomBytes(16).toString("hex");
  console.log(`[A2A] Agent Onboarded: ${agent_id} (Key: ${sessionKey})`);
  
  broadcast_activity(agent_id, "agent_onboarded", "system", 0);

  return res.json({
    status: "Active",
    session_key: sessionKey,
    quota: "10 free skins / day",
    docs: "https://agentskin.dev/llms.txt"
  });
});

/**
 * Unified "Skin" Endpoint (OpenRouter for APIs)
 * POST /v1/skin
 */
router.post("/skin", async (req, res) => {
  const { source, params } = req.body;
  const agentId = req.headers['x-agent-id'] || 'anonymous';
  const cacheKey = `${source}:${JSON.stringify(params)}`;

  // 1. Check Quota (Autonomous Billing)
  const currentUsage = cache.get(`usage:${agentId}`) || 0;
  
  if (currentUsage >= 10) {
    broadcast_activity(agentId, "quota_exceeded_402", source, 0);
    return res.status(402).json({
      error: "PAYMENT_REQUIRED",
      message: "Free tier quota (10 skins/day) exceeded.",
      checkout_url: process.env.STRIPE_CHECKOUT_URL || "https://buy.stripe.com/test_agentskin_pro_1c",
      protocol: "L402"
    });
  }
  
  cache.set(`usage:${agentId}`, currentUsage + 1);

  // 2. Check Cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      broadcast_activity(agentId, "cache_hit", source, 500);
      return res.json(cached.data);
    }
  }

  try {
    let sourceUrl;
    let normalized;

    // 2. Route based on "Source"
    if (source === "weather") {
      const { lat, lon } = params;
      sourceUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const response = await axios.get(sourceUrl);
      normalized = normalize_weather(response.data, sourceUrl);
    } 
    else if (source === "news") {
      const { query } = params;
      sourceUrl = "MediaStack API";
      normalized = await get_news_mediastack(query);
    }
    else if (source === "search") {
      const { query } = params;
      sourceUrl = "Serper.dev API";
      normalized = await search_serper(query);
      normalized = normalize_search(normalized.data, query);
    }
    else if (source === "generic") {
      const { url, signal } = params;
      sourceUrl = url;
      const response = await axios.get(url);
      normalized = normalize_generic(response.data, url, signal);
    }
    else {
      return res.status(400).json({ error: "Source not supported yet." });
    }

    const responseData = {
      skin: normalized.skin,
      raw_summary: normalized.data,
      metrics: normalized.metrics,
      optimized: true
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.setHeader("X-AgentSkin-Provenance", sourceUrl);
    
    // Broadcast net savings (after platform cut)
    broadcast_activity(agentId, `skin_generated:${source}`, source, normalized.metrics.net_agent_benefit);

    return res.json(responseData);

  } catch (error) {
    console.error("Unified Skin Error:", error);
    broadcast_activity(agentId, "error_failed", source, 0);
    return res.status(500).json({ error: "Failed to fetch and skin data." });
  }
});

export default router;
