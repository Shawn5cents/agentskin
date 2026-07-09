#!/usr/bin/env node

import { performance } from "node:perf_hooks";

import { clearFixtureCache, clearRuleCache, loadBuiltinFixtures, reduceExecutionWithRules, verifyBuiltinFixtures } from "../dist/index.js";
import { loadBuiltinRules } from "../dist/index.js";

function round(value) {
  return Number(value.toFixed(2));
}

async function benchFixtures() {
  clearFixtureCache();
  clearRuleCache();
  const fixtures = await loadBuiltinFixtures();
  const rules = await loadBuiltinRules();
  const start = performance.now();
  for (const { fixture } of fixtures) {
    await reduceExecutionWithRules(fixture.input, rules, { maxInlineChars: 5000 });
  }
  const totalMs = performance.now() - start;
  return {
    fixtures: fixtures.length,
    totalMs: round(totalMs),
    avgMs: round(totalMs / fixtures.length),
  };
}

async function benchVerify() {
  clearFixtureCache();
  clearRuleCache();
  const start = performance.now();
  const results = await verifyBuiltinFixtures();
  const totalMs = performance.now() - start;
  return {
    results: results.length,
    failed: results.filter((result) => !result.ok).length,
    totalMs: round(totalMs),
    avgMs: round(totalMs / results.length),
  };
}

const mode = process.argv[2] ?? "fixtures";
const output = mode === "verify" ? await benchVerify() : await benchFixtures();
process.stdout.write(`${JSON.stringify({ mode, ...output }, null, 2)}\n`);
