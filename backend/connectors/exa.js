import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "../lib/skin-engine.js";

/**
 * Exa (Metaphor) Connector: Neural Search
 * Returns a high-signal, token-optimized Neural Skin.
 */

export async function fetchExaSearch(query) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXA_API_KEY in environment.");
  }

  const url = "https://api.exa.ai/search";
  
  try {
    const response = await axios.post(url, {
      query: query,
      useAutoprompt: true,
      numResults: 5
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // 1. Define Exa Signals
    const signals = ["title", "url", "author", "publishedDate", "text", "score"];
    
    // 2. Prune raw data
    const pruned = recursive_prune(response.data, signals);
    const skin = to_markdown_skin(pruned, `EXA_SEARCH: ${query}`);
    const metrics = analyze_compression(response.data, skin);

    return { skin, metrics, source: "Exa Neural Search" };
  } catch (error) {
    console.error("Exa Search Failed:", error.message);
    throw error;
  }
}
