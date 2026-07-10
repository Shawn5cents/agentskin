#!/usr/bin/env node
import "dotenv/config";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { recursive_prune, to_markdown_skin, skin, classify_url, createCompactionMetadata } from "./lib/skin-engine.js";
import { skinReasoning } from "./lib/reasoning-skin.js";
import { stripAnsi, estimateTokens } from "./lib/text-utils.js";
import { reduceExecution } from "../suite/tokenjuice/dist/core/reduce.js";

// --- Input Validation ---

const FetchArgsSchema = z.object({
    url: z.string().url("Must be a valid URL"),
    signals: z.array(z.string()).default([]),
    aliases: z.record(z.string(), z.string()).default({}),
    apply_reasoning: z.boolean().default(false),
    auto_classify: z.boolean().default(true) // NEW: auto-classify URL via API skin rules
});

const SkinReasoningArgsSchema = z.object({
    text: z.string().min(1, "Text is required").max(50000, "Text exceeds 50,000 character limit")
});

const ReduceArgsSchema = z.object({
    command: z.string().min(1, "command is required"),
    output: z.string().min(1, "output is required"),
    cwd: z.string().optional(),
    exitCode: z.number().int().optional()
});

const EstimateTokensArgsSchema = z.object({
    text: z.string().min(1, "text is required")
});

const ApplyJsonSemanticArgsSchema = z.object({
    json: z.string().min(1, "json must be a non-empty string"),
    url: z.string().optional(),
    signals: z.array(z.string()).default([]),
    aliases: z.record(z.string(), z.string()).default({}),
    stripAnsiCodes: z.boolean().default(true),
    smallThreshold: z.number().min(0).default(300)
});

const MAX_REASONING_CHARS = 50_000;

// --- Rate Limiting ---

const RATE_LIMIT_WINDOW = 60_000; // 60 seconds
const RATE_LIMIT_MAX = 60; // max requests per window
const requestTimestamps = [];

function checkRateLimit() {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
        requestTimestamps.shift();
    }
    if (requestTimestamps.length >= RATE_LIMIT_MAX) {
        throw new Error(`Rate limit exceeded: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s`);
    }
    requestTimestamps.push(now);
}

// --- HTML Detection & Parsing ---

export function isHtmlContent(contentType) {
    return !!(contentType && (contentType.includes("text/html") || contentType.includes("application/xhtml+xml")));
}

const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB

export function htmlToText(html) {
    if (html.length > MAX_HTML_BYTES) {
        throw new Error(`HTML content exceeds ${MAX_HTML_BYTES / 1024 / 1024}MB limit`);
    }
    const $ = cheerio.load(html);
    
    const title = $("title").first().text().trim() || undefined;
    const metaDesc = $("meta[name='description']").attr("content") || "";
    
    // Remove noise
    $("script, style, noscript, iframe, svg").remove();
    
    const h1 = $("h1").first().text().trim() || undefined;
    const headings = [];
    $("h2, h3").each((i, el) => {
        if (i < 10) headings.push($(el).text().trim());
    });
    
    const links = [];
    $("a[href]").each((i, el) => {
        if (i < 10) {
            let href = $(el).attr("href") || "";
            // XSS protection: strip dangerous URI schemes entirely
            href = href.replace(/^\s*(?:javascript|data):.*/gi, "");
            links.push({ text: $(el).text().trim(), href });
        }
    });
    
    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 50000);
    
    return { title, h1, h2: headings, links, meta_description: metaDesc, body_text: bodyText };
}

// --- MCP Server ---

const server = new Server(
    { name: "agentskin-suite", version: "5.0.0" },
    { capabilities: { tools: {} } }
);

// --- Tool Definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "fetch_optimized_data",
            description: "Fetch any API or Web URL and return a token-optimized 'Skin'. Up to 88% token reduction for structured JSON. Supports auto-classification for GitHub, npm, HackerNews, weather APIs, and more. Pass signals to specify which keys to keep, or let the URL auto-classify.",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL to fetch and optimize" },
                    signals: {
                        type: "array",
                        items: { type: "string" },
                        description: "Signal keys to preserve. Leave empty to auto-classify based on URL."
                    },
                    aliases: {
                        type: "object",
                        description: "Key alias map: { original_key: signal_key }"
                    },
                    apply_reasoning: {
                        type: "boolean",
                        description: "Apply reasoning skin to string values (removes hedge/filler words)",
                        default: false
                    },
                    auto_classify: {
                        type: "boolean",
                        description: "Auto-classify URL via API skin rules (default: true)",
                        default: true
                    }
                },
                required: ["url"]
            }
        },
        {
            name: "skin_reasoning",
            description: "Optimize natural language text by removing linguistic noise (hedging, filler words, redundant phrases). 14-29% typical reduction.",
            inputSchema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Text to optimize" }
                },
                required: ["text"]
            }
        },
        {
            name: "classify_url",
            description: "Check if a URL matches any built-in API skin rules (GitHub, npm, weather, etc.). Returns the matched rule with signals and aliases, or null.",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "URL to classify" }
                },
                required: ["url"]
            }
        },
        {
            name: "strip_ansi",
            description: "Strip ANSI escape codes from text. Useful for cleaning terminal output before processing.",
            inputSchema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Text to strip ANSI codes from" }
                },
                required: ["text"]
            }
        },
        {
            name: "reduce",
            description: "Run the full Tokenjuice reduction pipeline on command output. Applies rule matching (136 rules), ANSI stripping, truncation, JSON semantic pruning, and other reducers based on the matched rule set.",
            inputSchema: {
                type: "object",
                properties: {
                    command: { type: "string", description: "The command that was run (e.g. curl ..., git status)" },
                    output: { type: "string", description: "The raw stdout output to reduce" },
                    cwd: { type: "string", description: "Working directory the command was run in" },
                    exitCode: { type: "number", description: "Exit code of the command" }
                },
                required: ["command", "output"]
            }
        },
        {
            name: "estimate_tokens",
            description: "Estimate the token count for a string. Uses grapheme-aware counting (via Intl.Segmenter) for accurate estimates on CJK, emoji, and combining marks.",
            inputSchema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Text to estimate tokens for" }
                },
                required: ["text"]
            }
        },
        {
            name: "apply_json_semantic",
            description: "Prune a JSON string using signal keys. Auto-classifies URL against built-in API rules (GitHub, npm, HackerNews, weather, Reddit, JSONPlaceholder). Keeps only signal-matched keys, applies alias remapping, flattens to markdown.",
            inputSchema: {
                type: "object",
                properties: {
                    json: { type: "string", description: "Raw JSON string to prune" },
                    url: { type: "string", description: "Original URL for auto-classification (e.g. https://api.github.com/repos/vercel/next.js)" },
                    signals: { type: "array", items: { type: "string" }, description: "Signal keys to keep (overrides auto-classification)" },
                    aliases: { type: "object", description: "Key alias remapping (e.g. stargazers_count -> stars)" },
                    stripAnsiCodes: { type: "boolean", description: "Strip ANSI before processing" },
                    smallThreshold: { type: "number", description: "Bypass threshold in tokens (default 300)" }
                },
                required: ["json"]
            }
        }
    ]
}));

// --- SSRF Protection ---

export function isSafeUrl(urlString) {
    try {
        const url = new URL(urlString);
        
        // Only allow http and https
        if (!["http:", "https:"].includes(url.protocol)) {
            return false;
        }
        
        // Strip IPv6 zone IDs
        let hostname = url.hostname.replace(/%.*$/, "");
        hostname = hostname.replace(/^\[|\]$/g, "");
        
        // Block IPv4-mapped IPv6
        if (hostname.startsWith("::ffff:")) return false;
        
        // Block cloud metadata hosts
        const blockedHosts = [
            "metadata.google.internal", "metadata.goog",
            "169.254.169.254", "metadata.azure.com", "metadata.internal",
            "kubernetes.default.svc", "kubernetes.default"
        ];
        if (blockedHosts.includes(hostname)) return false;
        
        // Block private/internal IPs
        const privatePatterns = [
            /^localhost$/i, /^127\./i, /^10\./i,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./i, /^192\.168\./i,
            /^169\.254\./i, /^0\./i,
            /^::$/i, /^::1$/i, /^fc00:/i, /^fe80:/i
        ];
        
        return !privatePatterns.some(pattern => pattern.test(hostname));
    } catch {
        return false;
    }
}

// --- Timeout Wrapper ---

const withTimeout = (promise, ms = 30_000) =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Processing timeout (30s exceeded)")), ms))
    ]);

// --- Tool Logic ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    checkRateLimit();
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "fetch_optimized_data": {
                const validated = FetchArgsSchema.parse(args);
                
                if (!isSafeUrl(validated.url)) {
                    return { content: [{ type: "text", text: "Error: URL failed safety check (blocked private/metadata hosts or non-HTTP protocol)" }] };
                }
                
                // Fetch the URL
                const response = await axios.get(validated.url, {
                    timeout: 10_000,
                    maxRedirects: 5,
                    maxContentLength: 5 * 1024 * 1024,
                    maxBodyLength: 5 * 1024 * 1024,
                    headers: { "Accept": "application/json, text/html, text/plain" },
                    beforeRedirect: (options) => {
                        const redirectUrl = options.href || options.url;
                        if (redirectUrl && !isSafeUrl(redirectUrl)) {
                            throw new Error("Redirect to blocked URL");
                        }
                    }
                });
                
                // Defense-in-depth: check final URL after redirects
                if (response.request?.res?.responseUrl && !isSafeUrl(response.request.res.responseUrl)) {
                    return { content: [{ type: "text", text: "Error: Redirected to blocked URL" }] };
                }
                
                let rawData;
                if (isHtmlContent(response.headers["content-type"])) {
                    rawData = htmlToText(response.data);
                } else {
                    rawData = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                }
                
                // Use the enhanced skin pipeline
                const result = await withTimeout(
                    Promise.resolve(skin(rawData, {
                        url: validated.auto_classify ? validated.url : '',
                        signals: validated.signals,
                        aliases: validated.aliases,
                        applyReasoning: validated.apply_reasoning,
                        stripAnsiCodes: true,
                        title: validated.url
                    })),
                    30_000
                );
                
                // Build response with metadata
                let responseText = result.skin;
                const metaLines = [];
                if (result.rule) {
                    metaLines.push(`[auto-classified: ${result.rule.id}]`);
                }
                if (result.metrics.applied) {
                    metaLines.push(`[${result.metrics.savings_ratio} reduction, ${result.metrics.raw_est_tokens} -> ${result.metrics.skin_est_tokens} tokens]`);
                } else if (result.metrics.reason) {
                    metaLines.push(`[${result.metrics.reason}]`);
                }
                if (metaLines.length > 0) {
                    responseText = metaLines.join(' ') + '\n' + responseText;
                }
                
                return { content: [{ type: "text", text: responseText || "(empty result)" }] };
            }

            case "skin_reasoning": {
                const validated = SkinReasoningArgsSchema.parse(args);
                const result = skinReasoning(validated.text);
                return { content: [{ type: "text", text: result.skin || "(no change)" }] };
            }

            case "classify_url": {
                if (!args.url || typeof args.url !== "string") {
                    return { content: [{ type: "text", text: "Error: url parameter is required" }] };
                }
                const classified = classify_url(args.url);
                return { content: [{ type: "text", text: JSON.stringify(classified, null, 2) || "null" }] };
            }

            case "strip_ansi": {
                if (!args.text || typeof args.text !== "string") {
                    return { content: [{ type: "text", text: "Error: text parameter is required" }] };
                }
                return { content: [{ type: "text", text: stripAnsi(args.text) }] };
            }

            case "reduce": {
                const validated = ReduceArgsSchema.parse(args);
                const input = {
                    toolName: "mcp-reduce",
                    command: validated.command,
                    argv: validated.command.split(/\s+/),
                    stdout: validated.output,
                    stderr: ""
                };
                if (validated.cwd) input.cwd = validated.cwd;
                if (validated.exitCode != null) input.exitCode = validated.exitCode;

                const result = await withTimeout(reduceExecution(input), 30_000);

                if (!result) {
                    return { content: [{ type: "text", text: "(no reduction applied)" }] };
                }

                const lines = [];
                if (result.classification?.matchedReducer) {
                    lines.push(`[classified: ${result.classification.matchedReducer}]`);
                }
                if (result.stats) {
                    const ratio = ((1 - result.stats.reducedChars / result.stats.rawChars) * 100).toFixed(1);
                    lines.push(`[reduction: ${ratio}%, ${result.stats.rawChars} → ${result.stats.reducedChars} chars]`);
                }
                lines.push(result.inlineText ?? "(empty result)");
                return { content: [{ type: "text", text: lines.join("\n") }] };
            }

            case "estimate_tokens": {
                const validated = EstimateTokensArgsSchema.parse(args);
                const tokens = estimateTokens(validated.text);
                return { content: [{ type: "text", text: JSON.stringify({ textLength: validated.text.length, estimatedTokens: tokens }) }] };
            }

            case "apply_json_semantic": {
                const validated = ApplyJsonSemanticArgsSchema.parse(args);
                let jsonStr = validated.json;

                if (validated.stripAnsiCodes) {
                    jsonStr = stripAnsi(jsonStr);
                }

                let parsedJson;
                try {
                    parsedJson = JSON.parse(jsonStr);
                } catch {
                    return { content: [{ type: "text", text: "Error: Invalid JSON string provided." }] };
                }

                const result = await withTimeout(
                    Promise.resolve(skin(parsedJson, {
                        url: validated.url || '',
                        signals: validated.signals,
                        aliases: validated.aliases,
                        stripAnsiCodes: validated.stripAnsiCodes,
                        smallThreshold: validated.smallThreshold
                    })),
                    30_000
                );

                let responseText = result.skin;
                const metaLines = [];
                if (result.rule) metaLines.push(`[auto-classified: ${result.rule.id}]`);
                if (result.metrics.applied) {
                    metaLines.push(`[${result.metrics.savings_ratio} reduction, ${result.metrics.raw_est_tokens} → ${result.metrics.skin_est_tokens} tokens]`);
                } else if (result.metrics.reason) {
                    metaLines.push(`[${result.metrics.reason}]`);
                }
                if (metaLines.length > 0) {
                    responseText = metaLines.join(' ') + '\n' + responseText;
                }
                return { content: [{ type: "text", text: responseText || "(empty result)" }] };
            }

            default:
                return { content: [{ type: "text", text: `Error: Unknown tool: ${name}. Available: fetch_optimized_data, skin_reasoning, classify_url, strip_ansi, reduce, estimate_tokens, apply_json_semantic` }] };
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            const details = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
            return { content: [{ type: "text", text: `Validation error: ${details}` }] };
        }
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
});

// --- Server Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AgentSkin Suite MCP Server v5.0.0 running via Stdio");
