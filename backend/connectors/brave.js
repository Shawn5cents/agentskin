import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "../lib/skin-engine.js";

/**
 * Brave Search Connector: Privacy-First Discovery
 * Returns a high-signal, token-optimized Search Skin.
 */

export async function fetchBraveSearch(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BRAVE_SEARCH_API_KEY in environment.");
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    // 1. Define Search Signals
    const signals = ["title", "description", "url", "name", "snippet"];
    
    // 2. Prune raw search data
    const pruned = recursive_prune(response.data, signals);
    const skin = to_markdown_skin(pruned, `BRAVE_SEARCH: ${query}`);
    const metrics = analyze_compression(response.data, skin);

    return { skin, metrics, source: "Brave Search" };
  } catch (error) {
    console.error("Brave Search Failed:", error.message);
    throw error;
  }
}
