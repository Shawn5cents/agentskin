#!/usr/bin/env node
/**
 * agent-optimizer.mjs
 *
 * Reads JSON ToolExecutionInput from stdin, runs Tokenjuice's
 * reduceExecution pipeline on it, and prints the compact form to stdout.
 *
 * Wire format (stdin):
 *   { "command": "git status", "argv": ["git","status"], "stdout": "...",
 *     "stderr": "", "exitCode": 0, "durationMs": 12, "toolName": "Bash" }
 *
 * Output (stdout):
 *   JSON CompactResult { inlineText, previewText, facts, stats, ... }
 *
 * Exit codes:
 *   0  success
 *   2  invalid input JSON
 *   3  reducer error
 *
 * Used by:
 *   - .agents/hooks/bash-optimizer.sh  (transparent terminal hook)
 *   - MOA agent bash tool               (programmatic optimization)
 *   - .agents/composio/tokenjuice.json  (Composio tool handler)
 */
import { createRequire } from "node:module";
import process from "node:process";
import { join, isAbsolute, resolve } from "node:path";

const require = createRequire(import.meta.url);
// Resolve the Tokenjuice dist relative to this script's location.
// When this script lives at <repoRoot>/scripts/agent-optimizer.mjs, the dist
// is at <repoRoot>/tokenjuice-extracted/tokenjuice-main/dist/.
// (When the script lived inside the extracted archive at
// <archive>/tokenjuice-main/scripts/, "../dist/index.js" was correct.)
// Allow TOKENJUICE_DIR env var to override the install location — this matches
// the convention used by .agents/mcp/tokenjuice-mcp.sh and
// .agents/hooks/bash-optimizer.sh, so a single env var configures the
// optimizer, the MCP launcher, and the bash hook consistently.
// Accept absolute or relative env var values (relative paths are resolved
// against the current working directory). Treat empty string the same as
// unset so a stray `TOKENJUICE_DIR=""` falls through to the default.
const tjDir = process.env.TOKENJUICE_DIR;
const distIndex = tjDir
  ? require.resolve(join(
      isAbsolute(tjDir) ? tjDir : resolve(tjDir),
      "dist/index.js",
    ))
  : require.resolve("../tokenjuice-extracted/tokenjuice-main/dist/index.js");
const tj = require(distIndex);

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
}

async function main() {
  let raw;
  try {
    raw = await readStdin();
  } catch (err) {
    process.stderr.write(`agent-optimizer: stdin read failed: ${err.message}\n`);
    process.exit(2);
  }

  let input;
  try {
    input = raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    process.stderr.write(`agent-optimizer: invalid JSON input: ${err.message}\n`);
    process.exit(2);
  }

  const argv = Array.isArray(input.argv) ? input.argv : [];
  const command = input.command || (argv[0] ?? "");
  const toolName = input.toolName || "Bash";
  const stdout = typeof input.stdout === "string" ? input.stdout : "";
  const stderr = typeof input.stderr === "string" ? input.stderr : "";
  const exitCode = Number.isInteger(input.exitCode) ? input.exitCode : 0;
  const durationMs = Number.isInteger(input.durationMs) ? input.durationMs : 0;
  const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
  const env = (input.env && typeof input.env === "object") ? input.env : undefined;

  const execInput = {
    toolName,
    command,
    argv,
    stdout,
    stderr,
    exitCode,
    durationMs,
    cwd,
    ...(env !== undefined ? { env } : {}),
  };

  let result;
  try {
    result = await tj.reduceExecution(execInput, {
      cwd,
      maxInlineChars: Number.isInteger(input.maxInlineChars) ? input.maxInlineChars : 4000,
    });
  } catch (err) {
    process.stderr.write(`agent-optimizer: reduce failed: ${err.message}\n`);
    process.exit(3);
  }

  process.stdout.write(JSON.stringify(result));
  process.stdout.write("\n");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`agent-optimizer: fatal: ${err && err.stack ? err.stack : err}\n`);
  process.exit(3);
});
