import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { recursive_prune, to_markdown_skin, analyze_compression } from "./lib/skin-engine.js";

/**
 * AgentSkin: The Universal MCP Server (v3.2)
 * This is the "Skill" that agents use to perceive the web efficiently.
 */

const server = new Server(
  {
    name: "agentskin-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Definition: fetch_optimized_data
 * This is what the agent "sees" in its toolbox.
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
    ],
  };
});

/**
 * Tool Logic: The "Perception Filter"
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "fetch_optimized_data") {
    throw new Error("Unknown tool");
  }

  const { url, headers, signals } = request.params.arguments;

  try {
    console.error(`[MCP] Agent is requesting optimized data for: ${url}`);
    
    // 1. Fetch raw data (Supports Custom Headers for BYOK)
    const response = await axios({
        method: 'get',
        url: url,
        headers: headers || {}
    });

    // 2. Skin it
    const pruned = recursive_prune(response.data, signals || []);
    const skin = to_markdown_skin(pruned, url);
    const metrics = analyze_compression(response.data, skin);

    // 3. Return to Agent
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
      content: [
        {
          type: "text",
          text: `Error fetching or skinning data: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the MCP Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin MCP Server running via Stdio");
