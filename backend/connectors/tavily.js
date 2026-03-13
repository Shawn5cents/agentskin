import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "../lib/skin-engine.js";

/**
 * Tavily Search Connector: The Agent's Choice
 * Returns a high-signal, token-optimized Search Skin.
 */

export async function fetchTavilySearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY in environment.");
  }

  const url = "https://api.tavily.com/search";
  
  try {
    const response = await axios.post(url, {
      api_key: apiKey,
      query: query,
      search_depth: "basic"
    });

    // 1. Define Tavily Signals
    const signals = ["title", "url", "content", "score"];
    
    // 2. Prune raw data
    const pruned = recursive_prune(response.data, signals);
    const skin = to_markdown_skin(pruned, `TAVILY_SEARCH: ${query}`);
    const metrics = analyze_compression(response.data, skin);

    return { skin, metrics, source: "Tavily Search" };
  } catch (error) {
    console.error("Tavily Search Failed:", error.message);
    throw error;
  }
}
