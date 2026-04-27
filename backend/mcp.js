#!/usr/bin/env node
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

/**
 * Utility: HTML Detection & Parsing
 */
const isHtmlContent = (contentType) => {
  if (!contentType) return false;
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
};

const htmlToText = (html) => {
  const $ = cheerio.load(html);
  
  // Remove script, style, and noscript elements
  $('script, style, noscript, iframe, svg, head').remove();
  
  // Get text from body, trimming whitespace
  let text = $('body').text().trim();
  
  // Collapse multiple spaces into single space
  text = text.replace(/\s+/g, ' ');
  
  // Convert to structured JSON for skinning
  // Extract key semantic elements
  const structured = {
    title: $('title').text().trim() || undefined,
    h1: $('h1').first().text().trim() || undefined,
    h2: $('h2, h3').map((i, el) => $(el).text().trim()).get() || undefined,
    paragraphs: $('p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 20) || undefined,
    links: $('a[href]').map((i, el) => ({ text: $(el).text().trim(), href: $(el).attr('href') })).get().slice(0, 10) || undefined,
    meta_description: $('meta[name="description"]').attr('content') || undefined,
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
    
    const hostname = url.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
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
      
      // Fetch Raw Data Locally
      const response = await axios.get(args.url, { timeout: 10000 });
      
      let dataToSkin = response.data;
      const contentType = response.headers['content-type'] || '';
      
      // If HTML, parse to structured text
      if (isHtmlContent(contentType)) {
        dataToSkin = htmlToText(response.data);
      }

      // Run the Local Skinning Engine
      const pruned = recursive_prune(dataToSkin, args.signals || [], args.aliases || {});
      const skin = to_markdown_skin(pruned, args.url, JSON.stringify(dataToSkin).length);
      
      return { content: [{ type: "text", text: skin }] };
    }

    // 2. Reasoning Skin: Local Distillation (Privacy-First)
    if (name === "skin_reasoning") {
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
