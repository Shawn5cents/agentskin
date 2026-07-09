#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listArtifactMetadata, runWrappedCommand, statsArtifacts } from "../dist/index.js";

async function main() {
  const storeDir = await mkdtemp(join(tmpdir(), "tokenjuice-live-"));

  try {
    const cases = [
      await runWrappedCommand(["git", "status", "--short", "--branch"], {
        store: true,
        storeDir,
      }),
      await runWrappedCommand(["node", "dist/cli/main.js", "verify", "--fixtures"], {
        store: true,
        storeDir,
      }),
    ];

    const entries = await listArtifactMetadata(storeDir);
    const stats = statsArtifacts(entries.map((entry) => ({ metadata: entry.metadata })));

    process.stdout.write(`${JSON.stringify({
      storeDir,
      cases: cases.map((item) => ({
        exitCode: item.exitCode,
        inlineText: item.result.inlineText,
        classification: item.result.classification,
        stats: item.result.stats,
      })),
      stats,
    }, null, 2)}\n`);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
}

await main();
