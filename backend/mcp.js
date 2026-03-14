import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./lib/skin-engine.js";
import { skinReasoning } from "./lib/reasoning-skin.js";

/**
 * AgentSkin: The Universal MCP Server (v3.5)
 * This is the "Skill" that agents use to perceive the web efficiently.
 */

const server = new Server(
  {
    name: "agentskin-server",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

import { fetchBraveSearch } from "./connectors/brave.js";
import { fetchTavilySearch } from "./connectors/tavily.js";
import { fetchExaSearch } from "./connectors/exa.js";
import { search_serper } from "./connectors/serper.js";
import { searchTriage } from "./lib/search-triage.js";

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_triage",
        description: "Synthesized 'Best-of-Web' search. Deduplicates results from Brave, Tavily, and Exa into one skin.",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
      },
      {
        name: "fetch_optimized_data",
        description: "Fetches any API or Web URL and returns a 90% token-optimized 'Skin'.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            signals: { type: "array", items: { type: "string" } }
          },
          required: ["url"],
        },
      },
      {
        name: "search_brave",
        description: "Privacy-first search with 67% token pruning.",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
      },
      {
        name: "search_tavily",
        description: "Agent-optimized search (Pass-thru integrity).",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
      },
      {
        name: "search_exa",
        description: "Neural search for agents (Precision pruning).",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
      },
      {
        name: "search_serp",
        description: "High-density SERP data pruning.",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
      },
      {
        name: "skin_reasoning",
        description: "Optimizes natural language text by removing linguistic noise.",
        inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
      },
    ],
  };
});

/**
 * Tool Logic
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_triage") {
      const { skin } = await searchTriage(args.query);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "fetch_optimized_data") {
      const response = await axios.get(args.url);
      const pruned = recursive_prune(response.data, args.signals || []);
      const skin = to_markdown_skin(pruned, args.url);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "search_brave") {
      const { skin } = await fetchBraveSearch(args.query);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "search_tavily") {
      const { skin } = await fetchTavilySearch(args.query);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "search_exa") {
      const { skin } = await fetchExaSearch(args.query);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "search_serp") {
      const { skin } = await search_serper(args.query);
      return { content: [{ type: "text", text: skin }] };
    }

    if (name === "skin_reasoning") {
      const { skin } = skinReasoning(args.text);
      return { content: [{ type: "text", text: skin }] };
    }

    throw new Error("Unknown tool");
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

/**
 * Start the MCP Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin MCP Server running via Stdio");
