import axios from "axios";
import { z } from "zod";

/**
 * MediaStack (APILayer) Connector: Legit News Aggregation
 * Returns a high-signal, token-optimized News Skin.
 */

const MediaStackSchema = z.object({
  data: z.array(z.object({
    title: z.string(),
    description: z.string().nullable(),
    url: z.string().url(),
    source: z.string(),
    published_at: z.string(),
  })),
});

export const get_news_mediastack = async (query) => {
  const apiKey = process.env.APILAYER_KEY;

  if (!apiKey) {
    throw new Error("Missing APILAYER_KEY in environment.");
  }

  // MediaStack API via APILayer (or direct)
  const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=${encodeURIComponent(query)}&languages=en&limit=5`;
  
  const response = await axios.get(url);
  const validated = MediaStackSchema.parse(response.data);

  // The "Skin": Deterministic, High-Density News Summary
  const skin = `### 📰 News: ${query}\n` + 
    validated.data.slice(0, 3).map((news, i) => 
      `${i+1}. **[${news.title}](${news.url})**\n   ${news.description?.substring(0, 100)}...`
    ).join("\n\n") + 
    `\n---\n[Source: MediaStack via APILayer](https://mediastack.com)`;

  return { skin, data: validated.data };
};
