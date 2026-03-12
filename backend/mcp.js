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

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_optimized_data",
        description: "Fetches any API or Web URL and returns a 90% token-optimized 'Skin'. Supports BYOK (Bring Your Own Key) for private data.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The raw API or JSON URL to fetch." },
            headers: { type: "object", description: "Optional: Custom HTTP headers (e.g. {'API-Key': 'your_key'}) for private data access." },
            signals: { type: "array", items: { type: "string" }, description: "Optional: Specific keys you are looking for (e.g. ['price', 'status'])." }
          },
          required: ["url"],
        },
      },
      {
        name: "skin_reasoning",
        description: "Optimizes natural language text for LLM-to-LLM communication by removing fillers, hedges, and redundant phrases. Increases 'Reasoning Density'.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "The raw text or agent reasoning to optimize." }
          },
          required: ["text"],
        },
      },
    ],
  };
});

/**
 * Tool Logic
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "fetch_optimized_data") {
    const { url, headers, signals } = request.params.arguments;

    try {
      console.error(`[MCP] Agent is requesting optimized data for: ${url}`);
      
      const response = await axios({
          method: 'get',
          url: url,
          headers: headers || {}
      });

      const pruned = recursive_prune(response.data, signals || []);
      const skin = to_markdown_skin(pruned, url);
      const metrics = analyze_compression(response.data, skin);

      return {
        content: [
          {
            type: "text",
            text: `${skin}\n\n[METRICS: Tokens Saved: ${metrics.savings_ratio}]`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "skin_reasoning") {
    const { text } = request.params.arguments;
    const { skin, metrics } = skinReasoning(text);
    
    return {
      content: [
        {
          type: "text",
          text: `${skin}\n\n[REASONING METRICS: Reduced by ${metrics.percentReduced}% | Net Benefit: ${metrics.netBenefit} tokens]`,
        },
      ],
    };
  }

  throw new Error("Unknown tool");
});

/**
 * Start the MCP Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin MCP Server running via Stdio");
