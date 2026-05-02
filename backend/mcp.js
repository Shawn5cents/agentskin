#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import https from "https";
import { recursive_prune, to_markdown_skin, isHtml, stripHtmlTags } from "./lib/skin-engine.js";
import { skinReasoning } from "./lib/reasoning-skin.js";

// Create HTTPS agent that doesn't reject self-signed certificates
// WARNING: This disables TLS certificate validation for development only.
// Remove before production use.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * AgentSkin: Semantic Shorthand Standard (SSS)
 * Open-Source Reference MCP Server.
 */

const server = new Server(
  {
    name: "agentskin-sss",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_optimized_data",
        description: "Fetches any API or Web URL and returns a 90% token-optimized 'Skin'. Supports custom signals and aliases.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            signals: { type: "array", items: { type: "string" }, description: "Keys to preserve (e.g. ['temp', 'wind'])" },
            aliases: { type: "object", description: "Map messy keys to clean ones (e.g. {'temperature_2m': 'temp'})" }
          },
          required: ["url"],
        },
      },
      {
        name: "skin_reasoning",
        description: "Optimizes natural language text by removing linguistic noise (hedging, filler).",
        inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
      },
    ],
  };
});

/**
 * Utility: SSRF Protection
 * Prevents agents from accessing local or private network resources.
 */
const isSafeUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    // Strip IPv6 zone ID and brackets
    let hostname = url.hostname.toLowerCase().split('%')[0].replace(/^\[|\]$/g, '');

    // Block all IPv4-mapped IPv6 addresses
    if (hostname.startsWith('::ffff:')) {
      return false;
    }

    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
      /^::$/,
      /^fc00:/,
      /^fe80:/
    ];

    return !privatePatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
};

/**
 * Tool Logic (100% Local-First Studio)
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // 1. Fetch Optimized Data: Local Pruning Studio (Privacy-First)
    if (name === "fetch_optimized_data") {
      if (!isSafeUrl(args.url)) {
        throw new Error("Access Denied: URL is restricted or invalid.");
      }
      
      // Fetch Raw Data Locally — with redirect SSRF guard and size caps
      const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB hard cap
      const response = await axios.get(args.url, {
        timeout: 30000,
        maxRedirects: 5,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_RESPONSE_BYTES,
        beforeRedirect: (opts) => {
          if (!isSafeUrl(opts.href)) {
            throw new Error('Access Denied: redirect target is restricted.');
          }
        },
        httpsAgent: process.env.NODE_ENV === 'development' ? httpsAgent : undefined,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive'
        }
      });

      // Defense-in-depth: validate final URL after redirects
      const finalUrl = response.request?.res?.responseUrl || response.config?.url;
      if (finalUrl && !isSafeUrl(finalUrl)) {
        throw new Error('Access Denied: final URL is restricted.');
      }

      // Check if response is HTML and strip tags
      if (isHtml(response.data)) {
        // HTML detected - strip tags and apply reasoning skin
        const strippedText = stripHtmlTags(response.data);
        // Apply reasoning skin to optimize the extracted text
        const { skin } = skinReasoning(strippedText);
        return { content: [{ type: "text", text: skin }] };
      }

      // Run the Local Skinning Engine for JSON/structured data
      const pruned = recursive_prune(response.data, args.signals || [], args.aliases || {});
      const skin = to_markdown_skin(pruned, args.url, JSON.stringify(response.data).length);
      
      return { content: [{ type: "text", text: skin }] };
    }

    // 2. Reasoning Skin: Local Distillation (Privacy-First)
    if (name === "skin_reasoning") {
      if (typeof args.text !== 'string' || args.text.length === 0) {
        throw new Error('Text cannot be empty');
      }
      if (args.text.length > 50000) {
        throw new Error('Text exceeds 50000 character limit');
      }
      const { skin } = skinReasoning(args.text);
      return { content: [{ type: "text", text: skin }] };
    }

    throw new Error("Unknown tool. Local-First Protocol supports 'fetch_optimized_data' and 'skin_reasoning'.");
  } catch (error) {
    return { content: [{ type: "text", text: `AgentSkin Local Error: ${error.message}` }], isError: true };
  }
});

/**
 * Start the MCP Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin MCP Server running via Stdio");
