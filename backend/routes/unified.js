import express from "express";
import { normalize_weather, normalize_search, normalize_generic } from "../engine.js";
import { get_news_mediastack } from "../connectors/mediastack.js";
import { search_serper } from "../connectors/serper.js";
import { broadcast_activity } from "../lib/events.js";
import { generate_challenge, verify_pow, POW_INSTRUCTIONS } from "../lib/pow.js";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// Simple Free-Tier Cache (In-Memory)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 Minutes

/**
 * Middleware: Anti-Botnet Proof of Work
 * Required for all Free Tier requests (anonymous or no session key).
 */
const check_pow = (req, res, next) => {
    const powNonce = req.headers['x-agentskin-pow'];
    const powSalt = req.headers['x-agentskin-salt'];
    const agentId = req.headers['x-agent-id'] || 'anonymous';

    // If they have a valid session/pro key, skip PoW (future implementation)
    // For now, everyone on free tier does the math.

    if (!powNonce || !powSalt) {
        const challenge = generate_challenge();
        broadcast_activity(agentId, "pow_challenge_issued", "security", 0);
        return res.status(429).json({
            error: "CHALLENGE_REQUIRED",
            message: "Proof-of-Work required to prevent botnet spam.",
            challenge,
            instructions: POW_INSTRUCTIONS
        });
    }

    if (!verify_pow(powSalt, powNonce)) {
        broadcast_activity(agentId, "pow_verification_failed", "security", 0);
        return res.status(403).json({ error: "INVALID_POW", message: "The math problem was solved incorrectly." });
    }

    next();
};

/**
 * A2A Onboarding (Moltbook Style)
 */
router.post("/onboard", check_pow, async (req, res) => {
  const { agent_id } = req.body;
  
  if (!agent_id) {
    return res.status(400).json({ error: "Missing 'agent_id' for A2A registration." });
  }

  const sessionKey = crypto.randomBytes(16).toString("hex");
  broadcast_activity(agent_id, "agent_onboarded", "system", 0);

  return res.json({
    status: "Active",
    session_key: sessionKey,
    quota: "10 free skins / day",
    docs: "https://agentskin.dev/llms.txt"
  });
});

/**
 * Unified "Skin" Endpoint
 */
router.post("/skin", check_pow, async (req, res) => {
  const { source, params } = req.body;
  const agentId = req.headers['x-agent-id'] || 'anonymous';
  const cacheKey = `${source}:${JSON.stringify(params)}`;

  // 1. Check Quota
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
    broadcast_activity(agentId, `skin_generated:${source}`, source, normalized.metrics.net_agent_benefit);

    return res.json(responseData);

  } catch (error) {
    console.error("Unified Skin Error:", error);
    broadcast_activity(agentId, "error_failed", source, 0);
    return res.status(500).json({ error: "Failed to fetch and skin data." });
  }
});

export default router;
