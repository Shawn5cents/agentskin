#!/usr/bin/env node
import "dotenv/config";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { recursive_prune, to_markdown_skin } from "./lib/skin-engine.js";
import { skinReasoning } from "./lib/reasoning-skin.js";

/**
 * AgentSkin: Semantic Shorthand Standard (SSS)
 * Open-Source Reference MCP Server.
 */

// Zod Schemas for Input Validation
const FetchArgsSchema = z.object({
  url: z.string().url("Invalid URL format"),
  signals: z.array(z.string()).optional().default([]),
  aliases: z.record(z.string()).optional().default({}),
  apply_reasoning: z.boolean().optional().default(false),
});

const SkinReasoningArgsSchema = z.object({
  text: z.string().min(1, "Text cannot be empty"),
});

/**
 * Utility: HTML Detection & Parsing
 */
export const isHtmlContent = (contentType) => {
  if (!contentType) return false;
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
};

export const htmlToText = (html) => {
  const $ = cheerio.load(html);

  // Extract title and meta from head BEFORE removing head
  const title = $('title').text().trim() || undefined;
  const meta_description = $('meta[name="description"]').attr('content') || undefined;

  // Remove script, style, and noscript elements (but not head yet for meta extraction)
  $('script, style, noscript, iframe, svg').remove();

  // Get text from body, trimming whitespace
  let text = $('body').text().trim();

  // Collapse multiple spaces into single space
  text = text.replace(/\s+/g, ' ');

  // Convert to structured JSON for skinning
  // Extract key semantic elements
  const structured = {
    title,
    h1: $('h1').first().text().trim() || undefined,
    h2: $('h2, h3').map((_, el) => $(el).text().trim()).get() || undefined,
    links: $('a[href]').map((_, el) => {
      const href = $(el).attr('href') || '';
      // Strip entire href for dangerous URL schemes to prevent XSS
      const isDangerous = /^(javascript:|data:)/i.test(href);
      return { text: $(el).text().trim(), href: isDangerous ? '' : href };
    }).get().slice(0, 10) || undefined,
    meta_description,
    body_text: text
  };

  // Remove undefined keys
  return Object.fromEntries(Object.entries(structured).filter(([_, v]) => v !== undefined));
};

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
            aliases: { type: "object", description: "Map messy keys to clean ones (e.g. {'temperature_2m': 'temp'})" },
            apply_reasoning: { type: "boolean", description: "Apply reasoning skin to string values during pruning" }
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
export const isSafeUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    // Strip IPv6 zone ID (e.g., fe80::1%eth0 -> fe80::1) and brackets (e.g., [::1] -> ::1)
    let hostname = url.hostname.toLowerCase().split('%')[0].replace(/^\[|\]$/g, '');

    // Block all IPv4-mapped IPv6 addresses (::ffff:...) as they all map to private ranges
    // Node.js normalizes [::ffff:127.0.0.1] to [::ffff:7f00:1]
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
      /^fe80:/,
    ];

    return !privatePatterns.some(pattern => pattern.test(hostname));
  } catch {
    return false;
  }
};

// Timeout wrapper for local processing operations (30s max)
const withTimeout = (promise, ms = 30000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Processing timeout (30s exceeded)')), ms))
  ]);

/**
 * Tool Logic (100% Local-First Studio)
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // 1. Fetch Optimized Data: Local Pruning Studio (Privacy-First)
    if (name === "fetch_optimized_data") {
      const validated = FetchArgsSchema.parse(args);

      if (!isSafeUrl(validated.url)) {
        throw new Error("Unable to fetch the requested resource.");
      }

      // Fetch Raw Data Locally
      const response = await axios.get(validated.url, { timeout: 10000 });

      let dataToSkin = response.data;
      const contentType = response.headers['content-type'] || '';

      // If HTML, parse to structured text
      if (isHtmlContent(contentType)) {
        dataToSkin = htmlToText(response.data);
      }

      // Run the Local Skinning Engine with timeout protection
      const pruned = await withTimeout(
        Promise.resolve(recursive_prune(dataToSkin, validated.signals, validated.aliases, validated.apply_reasoning))
      );
      const skin = to_markdown_skin(pruned, validated.url, JSON.stringify(dataToSkin).length);

      return { content: [{ type: "text", text: skin }] };
    }

    // 2. Reasoning Skin: Local Distillation (Privacy-First)
    if (name === "skin_reasoning") {
      const validated = SkinReasoningArgsSchema.parse(args);
      const { skin } = skinReasoning(validated.text);
      return { content: [{ type: "text", text: skin }] };
    }

    throw new Error("Unknown tool. Local-First Protocol supports 'fetch_optimized_data' and 'skin_reasoning'.");
  } catch (error) {
    // Provide user-friendly error messages without leaking internals
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { content: [{ type: "text", text: `Invalid input: ${messages}` }], isError: true };
    }
    return { content: [{ type: "text", text: `AgentSkin Error: ${error.message}` }], isError: true };
  }
});

/**
 * Start the MCP Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin MCP Server running via Stdio");
