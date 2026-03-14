import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "../lib/skin-engine.js";

/**
 * Cloudflare Crawl Connector: Whole-Site Perception (Beta)
 * 100% Compliant with March 2026 Specification
 */

export async function fetchSiteCrawl(domainUrl) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare Account ID or API Token.");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`;
  
  try {
    // 1. Initiate Crawl with the EXACT required schema
    console.log(`[CRAWL] Initiating whole-site crawl for: ${domainUrl}`);
    const initResponse = await axios.post(url, {
      url: domainUrl,
      limit: 5,
      formats: ["markdown", "json"],
      render: true,
      jsonOptions: {
        prompt: "Extract the main title and a high-density semantic summary from each page.",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "site_content",
            properties: {
              title: "string",
              summary: "string"
            }
          }
        }
      },
      rejectResourceTypes: ["image", "media", "font", "stylesheet"]
    }, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("[DEBUG] API Response:", JSON.stringify(initResponse.data, null, 2));
    
    // The Job ID is the 'result' string itself
    const jobId = initResponse.data.result;
    console.log(`[CRAWL] Detected Job ID: ${jobId}`);

    return { 
        jobId, 
        message: "Crawl successfully initiated using the 2026 spec.",
        source: "Cloudflare /crawl" 
    };
  } catch (error) {
    if (error.response && error.response.data) {
        console.error("Cloudflare API Detail:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("Cloudflare Crawl Failed:", error.message);
    throw error;
  }
}

/**
 * Jittered Delay Helper: Prevents Rate Limiting
 * Minimum delay: 10s (Cloudflare Free Limit)
 */
const rateLimitDelay = async () => {
    const baseDelay = 10000; // 10 seconds
    const jitter = Math.floor(Math.random() * 2000); // 0-2 seconds jitter
    const totalDelay = baseDelay + jitter;
    console.log(`[RATE_LIMIT] Cooling down for ${totalDelay / 1000}s...`);
    return new Promise(resolve => setTimeout(resolve, totalDelay));
};

/**
 * Fetch and Skin the results of a crawl job.
 */
export async function getSiteCrawlResults(jobId) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // 1. Enforce Rate Limit Compliance
  await rateLimitDelay();

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl/${jobId}`;
  
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    const rawData = response.data;
    
    // Define Crawl Signals (Title, Summary, Markdown Content)
    const signals = ["title", "summary", "markdown", "content", "url"];
    
    const pruned = recursive_prune(rawData, signals);
    const skin = to_markdown_skin(pruned, `CRAWL_RESULTS: ${jobId}`);
    const metrics = analyze_compression(rawData, skin);

    return { skin, metrics, status: rawData.status, source: "Cloudflare /crawl" };
  } catch (error) {
    console.error("Fetch Results Failed:", error.message);
    throw error;
  }
}
