/**
 * Tokenjuice MCP Server
 *
 * Exposes Tokenjuice's reduction capabilities as Model Context Protocol (MCP) tools.
 * Based on the AgentSkin MCP server pattern (agentskin/backend/mcp.js).
 *
 * Tools:
 *   - apply_json_semantic   – Prune JSON using signal keys (AgentSkin-style)
 *   - classify_url           – Match a URL against built-in API rules
 *   - strip_ansi             – Strip ANSI escape codes from text
 *   - estimate_tokens        – Estimate token count for a string
 *   - reduce                 – Run full Tokenjuice reduction pipeline on command output
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import {
  applyJsonSemantic,
  findUrlRule,
  estimateTokens,
} from "../../core/json-semantic.js";
import { stripAnsi } from "../../core/text.js";
import type { ToolExecutionInput } from "../../types.js";
import { reduceExecution } from "../../core/reduce.js";

// ---------------------------------------------------------------------------
// Server identity
// ---------------------------------------------------------------------------

const SERVER_INFO = {
  name: "tokenjuice-mcp",
  version: "0.8.0",
} as const;

// ---------------------------------------------------------------------------
// Rate limiting (Sliding window, in-memory)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const requestTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    throw new Error(
      `Rate limit exceeded: max ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s`,
    );
  }
  requestTimestamps.push(now);
}

// ---------------------------------------------------------------------------
// Timeout wrapper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Processing timeout (${ms / 1000}s exceeded)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

// ---------------------------------------------------------------------------
// Zod schemas for tool arguments
// ---------------------------------------------------------------------------

const ApplyJsonSemanticArgsSchema = z.object({
  json: z.string().min(1, "json must be a non-empty string"),
  url: z.string().optional(),
  signals: z.array(z.string()).optional(),
  aliases: z.record(z.string(), z.string()).optional(),
  stripAnsiCodes: z.boolean().optional(),
  smallThreshold: z.number().min(0).optional(),
});

const ClassifyUrlArgsSchema = z.object({
  url: z.string().min(1, "url is required"),
});

const StripAnsiArgsSchema = z.object({
  text: z.string().min(1, "text is required"),
});

const EstimateTokensArgsSchema = z.object({
  text: z.string().min(1, "text is required"),
});

const ReduceArgsSchema = z.object({
  command: z.string().min(1, "command is required"),
  output: z.string().min(1, "output is required"),
  cwd: z.string().optional(),
  exitCode: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

function getToolDefinitions() {
  return [
    {
      name: "apply_json_semantic",
      description:
        "Prune a JSON string using signal keys (AgentSkin-style semantic pruning). " +
        "Keeps only keys matching the signal set, optionally remaps via aliases, " +
        "and flattens to key: value markdown. Up to 88% token reduction on rich APIs.",
      inputSchema: {
        type: "object",
        properties: {
          json: { type: "string", description: "Raw JSON string to prune" },
          url: {
            type: "string",
            description:
              "Original URL for auto-classification (e.g. https://api.github.com/repos/vercel/next.js)",
          },
          signals: {
            type: "array",
            items: { type: "string" },
            description: "Signal keys to keep (overrides auto-classification)",
          },
          aliases: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Key alias remapping (e.g. stargazers_count -> stars)",
          },
          stripAnsiCodes: {
            type: "boolean",
            description: "Strip ANSI codes before processing",
          },
          smallThreshold: {
            type: "number",
            description: "Bypass threshold in tokens (default 300)",
          },
        },
        required: ["json"],
      },
    },
    {
      name: "classify_url",
      description:
        "Match a URL against built-in API skin rules (GitHub repos/users, npm registry, etc.). " +
        "Returns the matched rule with signals, aliases, and URL pattern.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to classify" },
        },
        required: ["url"],
      },
    },
    {
      name: "strip_ansi",
      description:
        "Strip ANSI escape codes from terminal output text. " +
        "Handles CSI, OSC, incomplete sequences, and single-char escapes.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text containing ANSI codes" },
        },
        required: ["text"],
      },
    },
    {
      name: "estimate_tokens",
      description:
        "Estimate the token count for a string. Uses grapheme-aware counting (÷ 4) " +
        "for accurate estimates on CJK, emoji, and combining marks.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to estimate tokens for" },
        },
        required: ["text"],
      },
    },
    {
      name: "reduce",
      description:
        "Run the full Tokenjuice reduction pipeline on command output. " +
        "Applies rule matching, ANSI stripping, truncation, JSON semantic pruning, " +
        "and other reducers based on the matched rule set.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "The command that was run (e.g. curl ..., git status)" },
          output: { type: "string", description: "The raw stdout output to reduce" },
          cwd: { type: "string", description: "Working directory the command was run in" },
          exitCode: { type: "number", description: "Exit code of the command" },
        },
        required: ["command", "output"],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleApplyJsonSemantic(args: unknown): Promise<string> {
  const parsed = ApplyJsonSemanticArgsSchema.parse(args);
  let jsonStr = parsed.json;

  if (parsed.stripAnsiCodes) {
    jsonStr = stripAnsi(jsonStr);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch {
    return "Error: Invalid JSON string provided.";
  }

  const result = applyJsonSemantic(parsedJson, {
    ...(parsed.url ? { url: parsed.url } : {}),
    ...(parsed.signals ? { signals: parsed.signals } : {}),
    ...(parsed.aliases ? { aliases: parsed.aliases } : {}),
    ...(parsed.stripAnsiCodes ? { stripAnsiCodes: parsed.stripAnsiCodes } : {}),
    ...(parsed.smallThreshold != null ? { smallThreshold: parsed.smallThreshold } : {}),
  });

  const { metrics, compaction } = result;
  const lines: string[] = [];

  if (!metrics.applied) {
    lines.push(`(passthrough: ${metrics.reason ?? "no change needed"})`);
  } else {
    if (result.rule) {
      lines.push(`[auto-classified: ${result.rule.id}]`);
    }
    if (metrics.raw_est_tokens != null && metrics.skin_est_tokens != null) {
      const ratio = metrics.savings_ratio ?? "0%";
      lines.push(`[savings: ${ratio}, ${metrics.raw_est_tokens} → ${metrics.skin_est_tokens} tokens]`);
    }
  }

  lines.push(result.skin);
  return lines.join("\n");
}

async function handleClassifyUrl(args: unknown): Promise<string> {
  const parsed = ClassifyUrlArgsSchema.parse(args);
  const rule = findUrlRule(parsed.url);
  if (!rule) {
    return "null";
  }
  return JSON.stringify(rule, null, 2);
}

async function handleStripAnsi(args: unknown): Promise<string> {
  const parsed = StripAnsiArgsSchema.parse(args);
  const cleaned = stripAnsi(parsed.text);
  return cleaned || "(empty result)";
}

async function handleEstimateTokens(args: unknown): Promise<string> {
  const parsed = EstimateTokensArgsSchema.parse(args);
  const tokens = estimateTokens(parsed.text);
  return JSON.stringify({ textLength: parsed.text.length, estimatedTokens: tokens });
}

async function handleReduce(args: unknown): Promise<string> {
  const parsed = ReduceArgsSchema.parse(args);

  const input: ToolExecutionInput = {
    toolName: "mcp-reduce",
    command: parsed.command,
    argv: parsed.command.split(/\s+/),
    ...(parsed.cwd ? { cwd: parsed.cwd } : {}),
    ...(parsed.exitCode != null ? { exitCode: parsed.exitCode } : {}),
    stdout: parsed.output,
    stderr: "",
  };

  const result = await reduceExecution(input);

  if (!result) {
    return "(no reduction applied)";
  }

  const lines: string[] = [];
  if (result.classification?.matchedReducer) {
    lines.push(`[classified: ${result.classification.matchedReducer}]`);
  }
  if (result.stats) {
    const ratio = ((1 - result.stats.reducedChars / result.stats.rawChars) * 100).toFixed(1);
    lines.push(`[reduction: ${ratio}%, ${result.stats.rawChars} → ${result.stats.reducedChars} chars]`);
  }
  lines.push(result.inlineText ?? "(empty result)");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  // ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolDefinitions(),
  }));

  // CallTool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      checkRateLimit();

      let result: string;

      switch (name) {
        case "apply_json_semantic":
          result = await withTimeout(handleApplyJsonSemantic(args));
          break;
        case "classify_url":
          result = await withTimeout(handleClassifyUrl(args));
          break;
        case "strip_ansi":
          result = await withTimeout(handleStripAnsi(args));
          break;
        case "estimate_tokens":
          result = await withTimeout(handleEstimateTokens(args));
          break;
        case "reduce":
          result = await withTimeout(handleReduce(args));
          break;
        default:
          return {
            content: [{ type: "text" as const, text: `Error: Unknown tool: ${name}` }],
          };
      }

      return {
        content: [{ type: "text" as const, text: result }],
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return {
          content: [{ type: "text" as const, text: `Validation error: ${details}` }],
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tokenjuice MCP Server v0.8.0 running via Stdio");
}

main().catch((err) => {
  console.error("Fatal error starting Tokenjuice MCP server:", err);
  process.exit(1);
});
