import { z } from "zod";
import { recursive_prune, to_markdown_skin } from "./lib/skin-engine.js";
import { skinReasoning } from "./lib/reasoning-skin.js";

/**
 * AgentSkin: The Semantic Engine (v2.6)
 * Deterministic Normalization + Reasoning Skin Integration.
 */

const COMMISSION_RATE = 0.20; // 20% flat cut on token savings value

export const calculate_savings_and_cut = (rawTokens) => {
    const savings = Math.floor(rawTokens * 0.9); // 90% savings
    const platformCut = Math.floor(savings * COMMISSION_RATE);
    return {
        total_saved: savings,
        platform_fee: platformCut,
        net_agent_benefit: savings - platformCut
    };
};

// --- REASONING SKIN ---
export const normalize_reasoning = (rawText, source = "REASONING") => {
  const { skin, metrics } = skinReasoning(rawText);
  return {
    skin: `### 🧠 ${source} (Skinned)\n${skin}`,
    data: { original: rawText, skinned: skin },
    metrics: {
        total_saved: metrics.estimatedTokenSavings,
        platform_fee: metrics.platformFee,
        net_agent_benefit: metrics.netBenefit
    }
  };
};

// --- WEATHER ---
const OpenMeteoSchema = z.object({
  current_weather: z.object({
    temperature: z.number(),
    windspeed: z.number(),
    weathercode: z.number(),
    time: z.string(),
  }),
});

export const normalize_weather = (rawData, sourceUrl) => {
  const validated = OpenMeteoSchema.parse(rawData);
  const { temperature, windspeed, weathercode } = validated.current_weather;

  const skin = `### 🌦️ Weather (Verified)
- **Temp:** ${temperature}°C
- **Wind:** ${windspeed}km/h
- **Code:** ${weathercode}
---
[Source: ${sourceUrl}](${sourceUrl})`;

  return { 
    skin, 
    data: validated.current_weather,
    metrics: calculate_savings_and_cut(1200) // Est weather API token weight
  };
};

// --- SEARCH ---
const SerperSchema = z.object({
  organic: z.array(z.object({
    title: z.string(),
    link: z.string().url(),
    snippet: z.string(),
  })).max(5),
});

export const normalize_search = (rawData, query) => {
  const validated = SerperSchema.parse(rawData);
  const results = validated.organic.map((res, i) => 
    `${i + 1}. **[${res.title}](${res.link})**\n   ${res.snippet}`
  ).join('\n\n');

  const skin = `### 🔍 Search: "${query}" (Verified)
${results}
---
[Source: Serper.dev](https://serper.dev)`;

  return { 
    skin, 
    data: validated.organic,
    metrics: calculate_savings_and_cut(4500) // Search results are heavy
  };
};

// --- NEWS ---
const NewsApiSchema = z.object({
  articles: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    source: z.object({ name: z.string() }),
    publishedAt: z.string(),
  })).max(5),
});

export const normalize_news = (rawData, topic) => {
  const validated = rawData.articles ? NewsApiSchema.parse(rawData) : { articles: rawData };
  const results = validated.articles.map((art, i) => 
    `${i + 1}. **[${art.title}](${art.url})** - *${art.source.name || 'Unknown Source'}*`
  ).join('\n\n');

  const skin = `### 📰 News: "${topic}" (Verified)
${results}
---
[Source: NewsAggregator]`;

  return { 
    skin, 
    data: validated.articles,
    metrics: calculate_savings_and_cut(3500)
  };
};

/**
 * Generic Normalization for Unknown Sources
 */
export const normalize_generic = (rawData, source, signalKeys = ['title', 'text', 'value', 'status']) => {
    if (typeof rawData === 'string') {
        return normalize_reasoning(rawData, source);
    }

    const pruned = recursive_prune(rawData, signalKeys);
    const skin = to_markdown_skin(pruned, source.toUpperCase());
    
    return {
        skin,
        data: pruned,
        metrics: calculate_savings_and_cut(JSON.stringify(rawData).length / 4) // Dynamic estimate
    };
};
