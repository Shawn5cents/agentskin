import axios from "axios";
import { z } from "zod";

/**
 * Serper.dev Connector: High-Performance Search
 * Returns a high-signal, noise-free Markdown "Skin".
 */

const SerperSchema = z.object({
  organic: z.array(z.object({
    title: z.string(),
    link: z.string().url(),
    snippet: z.string(),
  })),
});

export const search_serper = async (query) => {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing SERPER_API_KEY in environment.");
  }

  const response = await axios.post("https://google.serper.dev/search", 
    { q: query },
    { headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" } }
  );

  const validated = SerperSchema.parse(response.data);
  
  // The "Skin": Deterministic Markdown
  const skin = `### 🔍 Search: ${query}\n` + 
    validated.organic.slice(0, 3).map((res, i) => 
      `${i+1}. **[${res.title}](${res.link})**\n   ${res.snippet}`
    ).join("\n\n") + 
    `\n---\n[Source: Google via Serper.dev](https://serper.dev)`;

  const metrics = {
      raw_est_tokens: JSON.stringify(response.data).length / 4,
      skin_est_tokens: skin.length / 4,
      savings_ratio: (1 - (skin.length / JSON.stringify(response.data).length) * 100).toFixed(2) + "%"
  };

  return { skin, metrics, source: "Serper Search" };
};
