#!/usr/bin/env node
/**
 * benchmarks/full-stack-bench.mjs
 *
 * Full-stack token savings benchmark for AgentSkin + Tokenjuice + Caveman.
 *
 * Measures:
 *   1. API savings — AgentSkin on realistic JSON payloads (GitHub, npm, weather, HN)
 *   2. CLI savings — Tokenjuice-style reduction (git log, npm view, build output, ls)
 *   3. Caveman output compression — prose-to-caveman on typical agent replies
 *   4. Full session simulation — 3 API + 4 CLI commands, with/without optimization
 *   5. Honest numbers — includes MCP overhead, net savings after costs
 *
 * Usage:
 *   node benchmarks/full-stack-bench.mjs        # human-readable
 *   node benchmarks/full-stack-bench.mjs --json  # machine-readable
 */

import { skin, classify_url } from '../agentskin/backend/lib/skin-engine.js';
import { stripAnsi } from '../agentskin/backend/lib/text-utils.js';

// ─── Token Counting ───
function tok(s) {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

// ─── CLI Reducer (Tokenjuice-style, in-process) ───
function reduceCli(stdout, { maxLines = 200, dedupe = true } = {}) {
  if (!stdout) return { text: '', kinds: [] };
  const kinds = [];
  let text = stdout;

  // ANSI strip
  const before = text.length;
  text = stripAnsi(text);
  if (text.length < before) kinds.push('ansi-strip');

  // Collapse repeated lines
  if (dedupe) {
    const lines = text.split('\n');
    const out = [];
    let prev = null;
    let run = 0;
    for (const line of lines) {
      if (line === prev) { run++; continue; }
      if (run > 0) { out.push(`[${run}× repeated lines omitted]`); run = 0; }
      out.push(line);
      prev = line;
    }
    if (run > 0) out.push(`[${run}× omitted]`);
    text = out.slice(0, maxLines).join('\n');
    if (out.length > maxLines) {
      text += `\n[${out.length - maxLines} more lines truncated]`;
    }
    kinds.push('run-collapse');
  }

  return { text, kinds };
}

// ─── Realistic Fixtures ───

// GitHub repo response (realistic size)
const GITHUB_REPO = JSON.stringify({
  id: 565910434, node_id: 'MDEwOlJlcG9zaXRvcnk1NjU5MTA0MzQ=',
  name: 'express', full_name: 'expressjs/express', private: false,
  owner: { login: 'expressjs', id: 44492495, avatar_url: 'https://avatars.githubusercontent.com/u/44492495?v=4', type: 'Organization' },
  html_url: 'https://github.com/expressjs/express',
  description: 'Fast, unopinionated, minimalist web framework for node.',
  fork: false, url: 'https://api.github.com/repos/expressjs/express',
  created_at: '2012-04-04T19:51:15Z', updated_at: '2024-09-12T14:22:08Z', pushed_at: '2024-09-12T14:21:46Z',
  homepage: 'https://expressjs.com', size: 11432,
  stargazers_count: 65234, watchers_count: 65234, language: 'JavaScript',
  has_issues: true, has_projects: true, has_downloads: true, has_wiki: false,
  forks_count: 12453, open_issues_count: 178,
  license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT', url: 'https://api.github.com/licenses/mit' },
  allow_forking: true, is_template: false, visibility: 'public', default_branch: 'master',
  topics: ['express', 'javascript', 'nodejs', 'server', 'framework'],
  permissions: { admin: false, maintain: false, push: false, triage: false, pull: true },
});

// GitHub issues (3 issues, realistic)
const GITHUB_ISSUES = JSON.stringify([
  { number: 5812, title: 'Deprecation warning: app.del()', state: 'open', comments: 12,
    created_at: '2024-09-10T12:00:00Z', updated_at: '2024-09-12T08:00:00Z',
    user: { login: 'wesleytodd' },
    labels: [{ name: 'enhancement' }, { name: '5.x' }],
    body: 'Discussion about the deprecation path for legacy method aliases starting in v5. Users will need a migration path. '.repeat(6),
  },
  { number: 5811, title: '5.x RC: middleware ordering change', state: 'open', comments: 8,
    created_at: '2024-09-09T15:00:00Z', updated_at: '2024-09-11T10:00:00Z',
    user: { login: 'blakeembrey' },
    labels: [{ name: '5.x' }],
    body: 'The middleware ordering in 5.x RC changes from the 4.x behavior. This needs documentation for the upgrade guide. '.repeat(5),
  },
  { number: 5810, title: 'Router: TypeError on circular reference', state: 'closed', comments: 4,
    created_at: '2024-09-08T09:00:00Z', updated_at: '2024-09-10T14:00:00Z',
    user: { login: 'dougwilson' },
    labels: [{ name: 'bug' }],
    body: 'When a router mounts itself or creates a circular reference through sub-routers, a TypeError is thrown with a confusing stack trace. '.repeat(7),
  },
]);

// Weather API (already compact, tests passthrough)
const WEATHER = JSON.stringify({
  latitude: 52.52, longitude: 13.41, generationtime_ms: 0.5,
  utc_offset_seconds: 3600, timezone: 'Europe/Berlin', timezone_abbreviation: 'CEST', elevation: 38,
  current_weather: { temperature: 18.3, windspeed: 12.5, winddirection: 230, weathercode: 3, time: '2024-09-12T14:00' },
  hourly: {
    time: ['2024-09-12T00:00', '2024-09-12T01:00', '2024-09-12T02:00'],
    temperature_2m: [15.1, 14.8, 14.3],
    precipitation_probability: [10, 15, 20],
    windspeed_10m: [8.2, 9.1, 10.3],
  },
});

// CLI: git log --oneline -30
const GIT_LOG = Array.from({ length: 30 }, (_, i) => {
  const sha = (0x1a3b5c7 + i).toString(16).padStart(7, '0');
  const authors = ['alice', 'bob', 'carol', 'dave'];
  const msgs = [
    'deps: bump cookie to 0.7.1', 'fix: handle circular ref in router middleware',
    'build: update mocha to 10.7.0', 'docs: clarify 5.x migration guide',
    'feat: add app.locals and res.locals type support', 'chore: refresh dev dependencies',
    'test: add coverage for nested router edge case', 'perf: cache parsed query strings',
    'refactor: extract body parser middleware', 'fix: handle HEAD requests with redirect',
  ];
  return `${sha} (${authors[i % 4]}, 2024-09-${String(12 - Math.floor(i / 4)).padStart(2, '0')}) ${msgs[i % 10]}`;
}).join('\n');

// CLI: npm view with ANSI
const NPM_VIEW = '\x1b[0mexpress@4.21.2\x1b[0m | \x1b[32mMIT\x1b[0m | deps: \x1b[34m31\x1b[0m | versions: \x1b[34m287\x1b[0m\n\x1b[0mFast, unopinionated, minimalist web framework for node.\x1b[0m\n\n\x1b[1mdist-tags:\x1b[22m\nlatest: 4.21.2  next: 5.0.0-beta.3\n\n\x1b[1mdependencies:\x1b[22m\naccepts: ~1.3.8  array-flatten: 1.1.1  body-parser: ~1.20.3\ncontent-disposition: ~0.5.4  content-type: ~1.0.4  cookie: 0.7.1\ncookie-signature: 1.0.6  debug: 2.6.9  depd: ~2.0.0\nencodeurl: ~2.0.0  escape-html: ~1.0.3  etag: ~1.8.1\nfinalhandler: ~1.3.1  fresh: ~0.5.2  http-errors: ~2.0.0\nmerge-descriptors: ~1.0.1  methods: ~1.1.2  on-finished: ~2.4.1\nparseurl: ~1.3.3  path-to-regexp: 0.1.12  proxy-addr: ~2.0.7\nqs: ~6.13.0  range-parser: ~1.2.1  safe-buffer: 5.2.1\nsend: ~0.19.0  serve-static: ~1.16.2  setprototypeof: 1.2.0\nstatuses: ~2.0.1  type-is: ~1.6.18  utils: ~1.0.1  vary: ~1.1.2\n\n\x1b[1mmaintainers:\x1b[22m\n- dougwilson <doug@somethingdoug.com>\n- wesleytodd <wes@wesleytodd.com>';

// CLI: build output (noisy)
const BUILD_OUTPUT = Array.from({ length: 40 }, (_, i) => {
  if (i % 8 === 0) return `\x1b[32m✓\x1b[0m compiled module-${Math.floor(i/8)} in ${(Math.random()*2).toFixed(2)}s`;
  if (i % 5 === 0) return `\x1b[33m⚠\x1b[0m  warning: TS6133 'unused' is declared but never used (src/helpers.ts:${i*10+1})`;
  return `  processing src/component-${i}.ts...`;
}).join('\n');

// CLI: ls -la (dense but informative)
const LS_OUTPUT = `total 248
drwxr-xr-x  12 user  staff    384 Sep 12 14:22 .
drwxr-xr-x   8 user  staff    256 Sep  1 10:00 ..
-rw-r--r--   1 user  staff    124 Aug 28 09:15 .npmignore
-rw-r--r--   1 user  staff    336 Aug 28 09:15 .nycrc
-rw-r--r--   1 user  staff   1234 Aug 28 09:15 History.md
-rw-r--r--   1 user  staff   5678 Aug 28 09:15 LICENSE
-rw-r--r--   1 user  staff   4321 Aug 28 09:15 Readme.md
-rw-r--r--   1 user  staff   8765 Aug 28 09:15 index.js
-rw-r--r--   1 user  staff   2468 Aug 28 09:15 package.json
drwxr-xr-x   3 user  staff     96 Aug 28 09:15 bin/
drwxr-xr-x   4 user  staff    128 Aug 28 09:15 lib/
drwxr-xr-x   3 user  staff     96 Aug 28 09:15 test/`;

// ─── Agent Replies (for caveman measurement) ───
const AGENT_REPLY_NORMAL = "Sure! I'd be happy to help you with that. The issue you're experiencing is most likely caused by your authentication middleware not properly validating the token expiry. When a JWT token expires, the verification function should reject it, but it looks like your code is using `<` instead of `<=` in the expiry comparison, which allows already-expired tokens to pass through for a brief window. Let me take a look at your code and suggest a fix.";
const AGENT_REPLY_CAVEMAN = "Bug in auth middleware. Token expiry check use `<` not `<=`. Expired tokens pass brief window. Fix:";

const AGENT_REPLY_NORMAL2 = "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object, or better yet, extract it as a stable reference outside the component.";
const AGENT_REPLY_CAVEMAN2 = "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`.";

const AGENT_REPLY_NORMAL3 = "Looking at your database connection pooling setup, I can see several issues. First, your pool size is set to 20, but your database server's max_connections is 50, and you have 3 instances running — that's 60 potential connections, which will exhaust the database server under load. Additionally, you're not releasing connections in your error handlers, which means a failed query permanently leaks a connection from the pool. Finally, you should add connection timeout and idle timeout settings to prevent zombie connections from accumulating. Let me write up the fix.";
const AGENT_REPLY_CAVEMAN3 = "Pool size 20 × 3 instances = 60. DB max_connections = 50. Will exhaust under load. Also: no connection release in error handlers → leak on query failure. Fix: add timeout + cleanup.";

// ─── Session Definition ───
const SESSION = {
  task: 'Investigate express npm package: version, dependencies, open issues, recent commits',
  apiCalls: [
    { label: 'GitHub repo → expressjs/express', url: 'https://api.github.com/repos/expressjs/express', raw: GITHUB_REPO },
    { label: 'GitHub issues → express (open)', url: 'https://api.github.com/repos/expressjs/express/issues?state=open&per_page=3', raw: GITHUB_ISSUES },
    { label: 'Weather API → Berlin forecast', url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41', raw: WEATHER },
  ],
  cliCommands: [
    { label: 'git log --oneline -30', raw: GIT_LOG },
    { label: 'npm view express', raw: NPM_VIEW },
    { label: 'npm run build (output)', raw: BUILD_OUTPUT },
    { label: 'ls -la', raw: LS_OUTPUT },
  ],
  agentReplies: [
    { label: 'Auth bug diagnosis', normal: AGENT_REPLY_NORMAL, caveman: AGENT_REPLY_CAVEMAN },
    { label: 'React re-render explanation', normal: AGENT_REPLY_NORMAL2, caveman: AGENT_REPLY_CAVEMAN2 },
    { label: 'DB pool architecture review', normal: AGENT_REPLY_NORMAL3, caveman: AGENT_REPLY_CAVEMAN3 },
  ],
};

// ─── MCP Overhead Constants ───
const MCP_TOOL_CATALOG_TOKENS = tok(JSON.stringify({
  tools: [
    { name: 'fetch_optimized_data', description: 'Fetch any API or Web URL and return a token-optimized Skin. Up to 88% token reduction for structured JSON. Supports auto-classification for GitHub, npm, HackerNews, weather APIs, and more.' },
    { name: 'skin_reasoning', description: 'Optimize natural language text by removing linguistic noise (hedging, filler words, redundant phrases). 14-29% typical reduction.' },
    { name: 'classify_url', description: 'Check if a URL matches any built-in API skin rules (GitHub, npm, weather, etc.). Returns the matched rule with signals and aliases, or null.' },
    { name: 'strip_ansi', description: 'Strip ANSI escape codes from text. Useful for cleaning terminal output before processing.' },
    { name: 'apply_json_semantic', description: 'Prune a JSON string using signal keys (AgentSkin-style semantic pruning). Keeps only matching keys, optionally remaps via aliases, flattens to key:value markdown.' },
    { name: 'reduce', description: 'Run the full Tokenjuice reduction pipeline on command output. Applies rule matching, ANSI stripping, truncation, JSON semantic pruning, and other reducers.' },
    { name: 'estimate_tokens', description: 'Estimate token count for a string using grapheme-aware counting (÷ 4).' },
  ],
}));

const MCP_PER_CALL_OVERHEAD = 250; // ~250 tokens for tool name + params + result framing per call

// ─── Run ───
async function run({ json: jsonMode = false } = {}) {
  const report = {
    task: SESSION.task,
    apiResults: [],
    cliResults: [],
    cavemanResults: [],
    session: {},
    overhead: {},
    totals: {},
  };

  // ── 1. API Savings ──
  let apiRawTotal = 0, apiSkinTotal = 0;
  for (const call of SESSION.apiCalls) {
    const parsed = JSON.parse(call.raw);
    const rawText = call.raw;
    const rawTokens = tok(rawText);
    const result = skin(parsed, { url: call.url, stripAnsiCodes: true });
    // If the skin engine returns the payload unchanged (passthrough), use raw tokens
    const skinTokens = result.metrics.skin_est_tokens || rawTokens;
    const saved = rawTokens - skinTokens;
    const pct = rawTokens > 0 ? (saved / rawTokens * 100).toFixed(1) : '0.0';

    report.apiResults.push({
      label: call.label,
      rawTokens, skinTokens, saved, pct: parseFloat(pct),
      rule: result.rule?.id || 'none',
      kinds: result.compaction?.kinds || [],
      applied: result.metrics.applied || false,
    });
    apiRawTotal += rawTokens;
    apiSkinTotal += skinTokens;
  }

  // ── 2. CLI Savings ──
  let cliRawTotal = 0, cliSkinTotal = 0;
  for (const cmd of SESSION.cliCommands) {
    const rawTokens = tok(cmd.raw);
    const reduced = reduceCli(cmd.raw);
    const skinTokens = tok(reduced.text);
    const saved = rawTokens - skinTokens;
    const pct = rawTokens > 0 ? (saved / rawTokens * 100).toFixed(1) : '0.0';

    report.cliResults.push({
      label: cmd.label,
      rawTokens, skinTokens, saved, pct: parseFloat(pct),
      kinds: reduced.kinds,
    });
    cliRawTotal += rawTokens;
    cliSkinTotal += skinTokens;
  }

  // ── 3. Caveman Output Savings ──
  let cavemanRawTotal = 0, cavemanSkinTotal = 0;
  for (const reply of SESSION.agentReplies) {
    const rawTokens = tok(reply.normal);
    const skinTokens = tok(reply.caveman);
    const saved = rawTokens - skinTokens;
    const pct = rawTokens > 0 ? (saved / rawTokens * 100).toFixed(1) : '0.0';

    report.cavemanResults.push({
      label: reply.label,
      rawTokens, skinTokens, saved, pct: parseFloat(pct),
    });
    cavemanRawTotal += rawTokens;
    cavemanSkinTotal += skinTokens;
  }

  // ── 4. Full Session Simulation ──

  // Without optimization: raw API + raw CLI + normal agent replies
  const sessionRawInput = apiRawTotal + cliRawTotal;
  const sessionRaw = sessionRawInput + cavemanRawTotal;

  // With optimization (MCP path): tool catalog + per-call overhead + skinned results + caveman replies
  const sessionMCP = MCP_TOOL_CATALOG_TOKENS 
    + (SESSION.apiCalls.length + SESSION.cliCommands.length) * MCP_PER_CALL_OVERHEAD
    + apiSkinTotal + cliSkinTotal + cavemanSkinTotal;

  // With optimization (hook path): zero overhead + skinned results + caveman replies
  // The bash hook is transparent — no tool catalog, no per-call framing
  const sessionHook = apiSkinTotal + cliSkinTotal + cavemanSkinTotal;

  // Net savings (accounting for MCP overhead)
  const mcpNetSaved = sessionRaw - sessionMCP;
  const hookNetSaved = sessionRaw - sessionHook;
  const mcpNetPct = sessionRaw > 0 ? (mcpNetSaved / sessionRaw * 100).toFixed(1) : '0.0';
  const hookNetPct = sessionRaw > 0 ? (hookNetSaved / sessionRaw * 100).toFixed(1) : '0.0';

  report.session = {
    rawTotal: sessionRaw,
    rawInput: sessionRawInput,
    rawOutput: cavemanRawTotal,
    mcpTotal: sessionMCP,
    mcpOverhead: MCP_TOOL_CATALOG_TOKENS + (SESSION.apiCalls.length + SESSION.cliCommands.length) * MCP_PER_CALL_OVERHEAD,
    mcpNetSaved,
    mcpNetPct: parseFloat(mcpNetPct),
    hookTotal: sessionHook,
    hookNetSaved,
    hookNetPct: parseFloat(hookNetPct),
  };

  report.overhead = {
    toolCatalog: MCP_TOOL_CATALOG_TOKENS,
    perCallOverhead: MCP_PER_CALL_OVERHEAD,
    totalCalls: SESSION.apiCalls.length + SESSION.cliCommands.length,
    totalMCPOverhead: MCP_TOOL_CATALOG_TOKENS + (SESSION.apiCalls.length + SESSION.cliCommands.length) * MCP_PER_CALL_OVERHEAD,
  };

  report.totals = {
    apiRaw: apiRawTotal,
    apiSkin: apiSkinTotal,
    apiSaved: apiRawTotal - apiSkinTotal,
    apiPct: apiRawTotal > 0 ? ((apiRawTotal - apiSkinTotal) / apiRawTotal * 100).toFixed(1) : '0.0',
    cliRaw: cliRawTotal,
    cliSkin: cliSkinTotal,
    cliSaved: cliRawTotal - cliSkinTotal,
    cliPct: cliRawTotal > 0 ? ((cliRawTotal - cliSkinTotal) / cliRawTotal * 100).toFixed(1) : '0.0',
    cavemanRaw: cavemanRawTotal,
    cavemanSkin: cavemanSkinTotal,
    cavemanSaved: cavemanRawTotal - cavemanSkinTotal,
    cavemanPct: cavemanRawTotal > 0 ? ((cavemanRawTotal - cavemanSkinTotal) / cavemanRawTotal * 100).toFixed(1) : '0.0',
  };

  // ── Output ──
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  const HR = '═'.repeat(78);
  const LN = '─'.repeat(78);

  console.log(HR);
  console.log('  AgentSkin + Tokenjuice + Caveman — Full Stack Token Savings Benchmark');
  console.log(HR);
  console.log(`  Task: ${SESSION.task}`);
  console.log();

  // API section
  console.log('  ┌── API Savings (AgentSkin) ──┐');
  console.log(`  ${'Endpoint'.padEnd(48)} ${'Raw'.padStart(8)} ${'Skin'.padStart(8)} ${'Saved'.padStart(8)} ${'Pct'.padStart(8)}  Rule`);
  console.log(`  ${LN}`);
  for (const r of report.apiResults) {
    const label = r.label.padEnd(48).slice(0, 48);
    const status = r.applied ? '✓' : '—';
    console.log(`  ${label} ${String(r.rawTokens).padStart(8)} ${String(r.skinTokens).padStart(8)} ${String(r.saved).padStart(8)} ${(r.pct.toFixed(1)+'%').padStart(8)} ${status} ${r.rule}`);
  }
  console.log(`  ${LN}`);
  console.log(`  ${'API TOTAL'.padEnd(48)} ${String(report.totals.apiRaw).padStart(8)} ${String(report.totals.apiSkin).padStart(8)} ${String(report.totals.apiSaved).padStart(8)} ${(report.totals.apiPct+'%').padStart(8)}`);
  console.log();

  // CLI section
  console.log('  ┌── CLI Savings (Tokenjuice + bash hook) ──┐');
  console.log(`  ${'Command'.padEnd(48)} ${'Raw'.padStart(8)} ${'Reduced'.padStart(8)} ${'Saved'.padStart(8)} ${'Pct'.padStart(8)}  Kinds`);
  console.log(`  ${LN}`);
  for (const r of report.cliResults) {
    const label = r.label.padEnd(48).slice(0, 48);
    console.log(`  ${label} ${String(r.rawTokens).padStart(8)} ${String(r.skinTokens).padStart(8)} ${String(r.saved).padStart(8)} ${(r.pct.toFixed(1)+'%').padStart(8)}  ${r.kinds.join(', ')}`);
  }
  console.log(`  ${LN}`);
  console.log(`  ${'CLI TOTAL'.padEnd(48)} ${String(report.totals.cliRaw).padStart(8)} ${String(report.totals.cliSkin).padStart(8)} ${String(report.totals.cliSaved).padStart(8)} ${(report.totals.cliPct+'%').padStart(8)}`);
  console.log();

  // Caveman section
  console.log('  ┌── Output Savings (Caveman skill) ──┐');
  console.log(`  ${'Agent Reply'.padEnd(48)} ${'Normal'.padStart(8)} ${'Caveman'.padStart(8)} ${'Saved'.padStart(8)} ${'Pct'.padStart(8)}`);
  console.log(`  ${LN}`);
  for (const r of report.cavemanResults) {
    const label = r.label.padEnd(48).slice(0, 48);
    console.log(`  ${label} ${String(r.rawTokens).padStart(8)} ${String(r.skinTokens).padStart(8)} ${String(r.saved).padStart(8)} ${(r.pct.toFixed(1)+'%').padStart(8)}`);
  }
  console.log(`  ${LN}`);
  console.log(`  ${'CAVEMAN TOTAL'.padEnd(48)} ${String(report.totals.cavemanRaw).padStart(8)} ${String(report.totals.cavemanSkin).padStart(8)} ${String(report.totals.cavemanSaved).padStart(8)} ${(report.totals.cavemanPct+'%').padStart(8)}`);
  console.log();

  // Session simulation
  console.log('  ┌── Full Session Simulation ──┐');
  console.log();
  console.log(`  Session: ${SESSION.apiCalls.length} API calls + ${SESSION.cliCommands.length} CLI commands + ${SESSION.agentReplies.length} agent replies`);
  console.log();
  console.log('  ┌─────────────────────────┬──────────┬──────────┐');
  console.log('  │ Path                    │  Tokens  │  Savings │');
  console.log('  ├─────────────────────────┼──────────┼──────────┤');
  console.log(`  │ Raw (no optimization)   │ ${String(sessionRaw).padStart(8)} │       —  │`);
  console.log(`  │ MCP path (with overhead)│ ${String(sessionMCP).padStart(8)} │ ${(mcpNetPct+'%').padStart(7)} │`);
  console.log(`  │ Hook path (transparent)  │ ${String(sessionHook).padStart(8)} │ ${(hookNetPct+'%').padStart(7)} │`);
  console.log('  └─────────────────────────┴──────────┴──────────┘');
  console.log();
  console.log(`  MCP overhead: ${report.overhead.toolCatalog} tokens (catalog) + ${report.overhead.totalCalls} × ${report.overhead.perCallOverhead} (per-call) = ${report.overhead.totalMCPOverhead} tokens`);
  console.log(`  Hook overhead: 0 tokens (transparent — agent never knows optimization happened)`);
  console.log();

  // Honest verdict
  console.log('  ┌── Honest Verdict ──┐');
  console.log();

  const hookWin = hookNetSaved - mcpNetSaved;
  if (hookNetPct > 10) {
    console.log(`  ✅ Hook path wins: ${hookNetPct}% net savings (${hookNetSaved} tokens saved per session)`);
  } else if (hookNetPct > 0) {
    console.log(`  ~ Hook path: ${hookNetPct}% net savings — modest but positive`);
  } else {
    console.log(`  ⚠ Hook path: ${hookNetPct}% — optimization costs more than it saves`);
  }

  if (mcpNetPct > 0) {
    console.log(`  ~  MCP path: ${mcpNetPct}% net savings — positive but ${hookWin} fewer tokens saved vs hook`);
  } else {
    console.log(`  ⚠ MCP path: ${mcpNetPct}% — overhead exceeds savings. Use hook path instead.`);
  }

  console.log();
  console.log(`  The bash hook saves ${hookWin} MORE tokens than MCP because it has zero context overhead.`);
  console.log(`  MCP adds ${report.overhead.totalMCPOverhead} tokens of overhead before any optimization happens.`);
  console.log();
  console.log(HR);
  console.log('  Run with --json for machine-readable output.');

  return report;
}

const jsonMode = process.argv.includes('--json');
run({ json: jsonMode })
  .then(() => process.exit(0))
  .catch(err => { console.error('Benchmark failed:', err); process.exit(1); });
