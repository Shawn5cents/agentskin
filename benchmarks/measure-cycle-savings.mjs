#!/usr/bin/env node
/**
 * benchmarks/measure-cycle-savings.mjs
 *
 * End-to-end measurement of context savings in a simulated MOA agent cycle.
 *
 * What it does:
 *   1. Defines a realistic coding task ("research the express npm package")
 *   2. Simulates an agent cycle with N API calls + M CLI commands
 *   3. Runs the cycle twice: once with raw output, once with AgentSkin + a
 *      minimal Tokenjuice-style CLI reducer
 *   4. Counts tokens for each path, reports the delta
 *
 * Uses the real AgentSkin library (../agentskin/backend/lib/skin-engine.js) and
 * a built-in minimal CLI reducer (since the Tokenjuice dist needs a separate
 * build step).
 *
 * Usage:
 *   node benchmarks/measure-cycle-savings.mjs            # full cycle
 *   node benchmarks/measure-cycle-savings.mjs --json     # machine-readable
 *
 * Exit codes:
 *   0  cycle completed, report generated
 *   1  cycle failed
 */

import { skin } from '../agentskin/backend/lib/skin-engine.js';
// (intentionally not using estimateTokensFast — the local tokenize() mirrors
// the bash hook's len/4 estimator for apples-to-apples comparison)

// ---------- Token counting (matches bash hook) ----------
function tokenize(s) {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

// ---------- Minimal CLI reducer (Tokenjuice-style) ----------
/**
 * Reduce noisy CLI output: strip ANSI, collapse repeated lines, clamp long
 * output. Mirrors what `opt <command>` does via the bash hook, in-process.
 */
function reduceCli(stdout, { maxLines = 200, dedupeRuns = true } = {}) {
  if (!stdout) return { text: '', kinds: [] };
  // Strip ANSI
  const stripped = stdout
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\][^\x07]*\x07/g, '');
  const lines = stripped.split('\n');
  const out = [];
  let prev = null;
  let runCount = 0;
  for (const line of lines) {
    if (dedupeRuns && line === prev) {
      runCount++;
      continue;
    }
    if (runCount > 0) {
      out.push(`  ... ×${runCount} omitted`);
      runCount = 0;
    }
    out.push(line);
    prev = line;
  }
  if (runCount > 0) out.push(`  ... ×${runCount} omitted`);
  let text = out.slice(0, maxLines).join('\n');
  if (out.length > maxLines) {
    text += `\n  ... +${out.length - maxLines} more lines`;
  }
  return { text, kinds: ['ansi-strip', 'run-collapse'] };
}

// ---------- Fixtures (representative, not exact live snapshots) ----------
const FIXTURE_NPM_EXPRESS = JSON.stringify({
  name: 'express',
  description: 'Fast, unopinionated, minimalist web framework for node.',
  'dist-tags': { latest: '4.21.2', next: '5.0.0-beta.3' },
  versions: Object.fromEntries(
    Array.from({ length: 287 }, (_, i) => [`4.${Math.floor(i / 30)}.${i % 30}`, {
      name: 'express',
      version: `4.${Math.floor(i / 30)}.${i % 30}`,
      dependencies: {
        accepts: '~1.3.8', 'array-flatten': '1.1.1', 'body-parser': '~1.20.3',
        'content-disposition': '~0.5.4', 'content-type': '~1.0.4', cookie: '0.7.1',
        'cookie-signature': '1.0.6', debug: '2.6.9', depd: '~2.0.0',
        encodeurl: '~2.0.0', 'escape-html': '~1.0.3', etag: '~1.8.1',
        finalhandler: '~1.3.1', fresh: '~0.5.2', 'http-errors': '~2.0.0',
        'merge-descriptors': '~1.0.1', methods: '~1.1.2', 'on-finished': '~2.4.1',
        parseurl: '~1.3.3', 'path-to-regexp': '0.1.12', 'proxy-addr': '~2.0.7',
        qs: '~6.13.0', 'range-parser': '~1.2.1', 'safe-buffer': '5.2.1',
        send: '~0.19.0', 'serve-static': '~1.16.2', setprototypeof: '1.2.0',
        statuses: '~2.0.1', 'type-is': '~1.6.18', utils: '~1.0.1', vary: '~1.1.2',
      },
      devDependencies: {
        after: '0.8.2', 'connect-redis': '~3.4.2', 'cookie-session': '~2.1.0',
        ejs: '~3.1.10', eslint: '8.57.0', 'express-session': '~1.18.1',
        hbs: '~4.2.0', 'http-proxy': '~1.18.1', marked: '0.3.19',
        mocha: '~10.7.0', morgan: '~1.10.0', multiparty: '~4.2.3',
        pug: '~3.0.3', should: '~13.2.3', supertest: '~7.0.0', vhost: '~3.0.2',
      },
      gitHead: `a${'0'}b${'0'}c${'0'}d`,
      scripts: { test: 'mocha --reporter spec --bail --check-leaks test/' },
      homepage: 'https://expressjs.com',
      license: 'MIT',
    }])
  ),
  time: Object.fromEntries(
    Array.from({ length: 287 }, (_, i) => [`4.${Math.floor(i / 30)}.${i % 30}`, '2024-01-01T00:00:00.000Z'])
  ),
  maintainers: Array.from({ length: 12 }, (_, i) => ({ name: `maintainer${i}`, email: `m${i}@example.com` })),
  keywords: ['express', 'framework', 'web', 'rest', 'restful', 'router', 'app', 'api'],
  author: { name: 'TJ Holowaychuk', email: 'tj@vision-media.ca' },
  repository: { type: 'git', url: 'git+https://github.com/expressjs/express.git' },
  bugs: { url: 'https://github.com/expressjs/express/issues' },
  license: 'MIT',
});

const FIXTURE_GITHUB_EXPRESS = JSON.stringify({
  id: 565910434,
  node_id: 'MDEwOlJlcG9zaXRvcnk1NjU5MTA0MzQ=',
  name: 'express',
  full_name: 'expressjs/express',
  private: false,
  owner: {
    login: 'expressjs', id: 44492495,
    node_id: 'MDEyOk9yZ2FuaXphdGlvbjQ0NDkyNDk1',
    avatar_url: 'https://avatars.githubusercontent.com/u/44492495?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/expressjs',
    html_url: 'https://github.com/expressjs',
    type: 'Organization',
    site_admin: false,
  },
  html_url: 'https://github.com/expressjs/express',
  description: 'Fast, unopinionated, minimalist web framework for node.',
  fork: false,
  url: 'https://api.github.com/repos/expressjs/express',
  created_at: '2012-04-04T19:51:15Z',
  updated_at: '2024-09-12T14:22:08Z',
  pushed_at: '2024-09-12T14:21:46Z',
  homepage: 'https://expressjs.com',
  size: 11432,
  stargazers_count: 65234,
  watchers_count: 65234,
  language: 'JavaScript',
  has_issues: true,
  has_projects: true,
  has_downloads: true,
  has_wiki: false,
  has_pages: false,
  forks_count: 12453,
  mirror_url: null,
  archived: false,
  disabled: false,
  open_issues_count: 178,
  license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT', url: 'https://api.github.com/licenses/mit', node_id: 'MDc6TGljZW5zZTEz' },
  allow_forking: true,
  is_template: false,
  topics: ['express', 'javascript', 'nodejs', 'server', 'framework'],
  visibility: 'public',
  forks: 12453,
  open_issues: 178,
  watchers: 65234,
  network_count: 12453,
  subscribers_count: 1287,
  default_branch: 'master',
  permissions: { admin: false, maintain: false, push: false, triage: false, pull: true },
});

const FIXTURE_GITHUB_ISSUES = JSON.stringify(
  Array.from({ length: 3 }, (_, i) => ({
    id: 2400000000 + i,
    number: 5812 - i,
    title: ['Deprecation warning: app.del()', '5.x RC: middleware ordering change', 'Router: TypeError on circular reference'][i],
    state: 'open',
    locked: false,
    comments: 12 + i * 3,
    created_at: '2024-09-10T12:00:00Z',
    updated_at: '2024-09-12T08:00:00Z',
    user: {
      login: ['wesleytodd', 'blakeembrey', 'dougwilson'][i],
      id: 100000 + i,
      avatar_url: `https://avatars.githubusercontent.com/u/${100000 + i}?v=4`,
      url: `https://api.github.com/users/user${i}`,
      type: 'User',
    },
    labels: [
      { id: 2001, name: 'enhancement', color: 'a2eeef' },
      { id: 2002, name: '5.x', color: 'fbca04' },
    ],
    body: `Long issue body that an agent doesn't need to read in full to triage this — the title and labels are signal enough.`.repeat(8),
    html_url: `https://github.com/expressjs/express/issues/${5812 - i}`,
  }))
);

const FIXTURE_CLI_LS = `
total 248
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
drwxr-xr-x   3 user  staff     96 Aug 28 09:15 test/
`.trim();

const FIXTURE_CLI_NPM_VIEW = `
\x1b[0mexpress@4.21.2\x1b[0m | \x1b[32mMIT\x1b[0m | deps: \x1b[34m31\x1b[0m | versions: \x1b[34m287\x1b[0m
\x1b[0mFast, unopinionated, minimalist web framework for node.\x1b[0m

\x1b[1mdist-tags:\x1b[22m
latest: 4.21.2
next: 5.0.0-beta.3

\x1b[1mdependencies:\x1b[22m
accepts: ~1.3.8
array-flatten: 1.1.1
body-parser: ~1.20.3
content-disposition: ~0.5.4
content-type: ~1.0.4
cookie: 0.7.1
cookie-signature: 1.0.6
debug: 2.6.9
depd: ~2.0.0
encodeurl: ~2.0.0
escape-html: ~1.0.3
etag: ~1.8.1
finalhandler: ~1.3.1
fresh: ~0.5.2
http-errors: ~2.0.0
merge-descriptors: ~1.0.1
methods: ~1.1.2
on-finished: ~2.4.1
parseurl: ~1.3.3
path-to-regexp: 0.1.12
proxy-addr: ~2.0.7
qs: ~6.13.0
range-parser: ~1.2.1
safe-buffer: 5.2.1
send: ~0.19.0
serve-static: ~1.16.2
setprototypeof: 1.2.0
statuses: ~2.0.1
type-is: ~1.6.18
utils: ~1.0.1
vary: ~1.1.2

\x1b[1mmaintainers:\x1b[22m
- dougwilson <doug@somethingdoug.com>
- wesleytodd <wes@wesleytodd.com>
`.trim();

const FIXTURE_CLI_GIT_LOG = Array.from({ length: 80 }, (_, i) => {
  const sha = (0x1234567 + i).toString(16).padStart(7, '0');
  const dates = ['2 days ago', '3 days ago', '5 days ago', '1 week ago', '2 weeks ago', '1 month ago'];
  const msgs = [
    'deps: cookie@0.7.1',
    'build: bump mocha to 10.7.0',
    'fix: handle circular ref in router',
    'docs: update 5.x migration guide',
    'chore: refresh dev deps',
    'feat: add app.locals support',
  ];
  return `${sha} ${dates[i % dates.length]} ${msgs[i % msgs.length]}`;
}).join('\n');

// ---------- Cycle definition (references fixtures above) ----------
const CYCLE = {
  task: 'Research the express npm package: version, dependencies, open issues, recent activity',
  steps: [
    {
      kind: 'api',
      label: 'npm registry → express',
      url: 'https://registry.npmjs.org/express',
      rawFixture: FIXTURE_NPM_EXPRESS,
    },
    {
      kind: 'api',
      label: 'GitHub repo → expressjs/express',
      url: 'https://api.github.com/repos/expressjs/express',
      rawFixture: FIXTURE_GITHUB_EXPRESS,
    },
    {
      kind: 'api',
      label: 'GitHub issues → expressjs/express (first 3)',
      url: 'https://api.github.com/repos/expressjs/express/issues?per_page=3',
      rawFixture: FIXTURE_GITHUB_ISSUES,
    },
    {
      kind: 'cli',
      label: 'ls -la node_modules/express',
      rawFixture: FIXTURE_CLI_LS,
    },
    {
      kind: 'cli',
      label: 'npm view express version dependencies',
      rawFixture: FIXTURE_CLI_NPM_VIEW,
    },
    {
      kind: 'cli',
      label: 'git log --oneline -20',
      rawFixture: FIXTURE_CLI_GIT_LOG,
    },
  ],
};

// ---------- Run the cycle ----------
async function runCycle({ json = false } = {}) {
  const perStep = [];
  let totalRaw = 0;
  let totalSkinned = 0;
  const jsonOutput = { task: CYCLE.task, steps: [], totals: {} };

  for (const step of CYCLE.steps) {
    if (step.kind === 'api') {
      const parsed = JSON.parse(step.rawFixture);
      const rawText = JSON.stringify(parsed);
      const rawTokens = tokenize(rawText);
      const result = skin(parsed, { url: step.url, stripAnsiCodes: true });
      const skinnedTokens = result.metrics.applied ? tokenize(result.skin) : rawTokens;
      perStep.push({
        kind: 'api',
        label: step.label,
        url: step.url,
        rawTokens,
        skinnedTokens,
        applied: result.metrics.applied,
        kinds: result.compaction.kinds,
        reason: result.metrics.reason,
      });
      totalRaw += rawTokens;
      totalSkinned += skinnedTokens;
    } else if (step.kind === 'cli') {
      const rawText = step.rawFixture;
      const rawTokens = tokenize(rawText);
      const reduced = reduceCli(rawText);
      const skinnedTokens = tokenize(reduced.text);
      perStep.push({
        kind: 'cli',
        label: step.label,
        rawTokens,
        skinnedTokens,
        applied: skinnedTokens < rawTokens,
        kinds: reduced.kinds,
      });
      totalRaw += rawTokens;
      totalSkinned += skinnedTokens;
    }
  }

  const totalSavings = totalRaw - totalSkinned;
  const savingsPct = totalRaw > 0 ? (totalSavings / totalRaw) * 100 : 0;

  jsonOutput.steps = perStep;
  jsonOutput.totals = { raw: totalRaw, skinned: totalSkinned, saved: totalSavings, pct: savingsPct };

  if (json) {
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  }

  console.log('━'.repeat(72));
  console.log(`MOA cycle measurement: ${CYCLE.task}`);
  console.log('━'.repeat(72));
  console.log(`${'Step'.padEnd(48)} ${'Raw'.padStart(8)} ${'Skin'.padStart(8)} ${'Saved'.padStart(8)} ${'Pct'.padStart(8)}`);
  console.log('─'.repeat(72));
  for (const s of perStep) {
    const label = s.label.length > 47 ? s.label.slice(0, 44) + '…' : s.label;
    const saved = s.rawTokens - s.skinnedTokens;
    const pct = s.rawTokens > 0 ? (saved / s.rawTokens) * 100 : 0;
    const pctStr = `${pct >= 0 ? pct.toFixed(1) : '0.0'}%`;
    const savedClass = saved > 0 ? '✓' : ' ';
    console.log(`${label.padEnd(48)} ${s.rawTokens.toString().padStart(8)} ${s.skinnedTokens.toString().padStart(8)} ${saved.toString().padStart(8)} ${pctStr.padStart(7)} ${savedClass}`);
  }
  console.log('─'.repeat(72));
  const totalPctStr = `${savingsPct.toFixed(1)}%`;
  console.log(`${'TOTAL'.padEnd(48)} ${totalRaw.toString().padStart(8)} ${totalSkinned.toString().padStart(8)} ${totalSavings.toString().padStart(8)} ${totalPctStr.padStart(7)}`);
  console.log('━'.repeat(72));

  const kindCounts = new Map();
  for (const s of perStep) {
    for (const k of (s.kinds || [])) {
      kindCounts.set(k, (kindCounts.get(k) || 0) + 1);
    }
  }
  if (kindCounts.size > 0) {
    console.log('\nCompactionKinds applied:');
    for (const [k, c] of [...kindCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(22)} ×${c}`);
    }
  }

  console.log('\nVerdict:');
  if (savingsPct >= 50) {
    console.log(`  ✓ STRONG savings: ${savingsPct.toFixed(1)}% reclaimed per cycle`);
  } else if (savingsPct >= 20) {
    console.log(`  ~ MODERATE savings: ${savingsPct.toFixed(1)}% reclaimed per cycle`);
  } else if (savingsPct > 0) {
    console.log(`  ~ marginal savings: ${savingsPct.toFixed(1)}% reclaimed per cycle`);
  } else {
    console.log(`  ✗ no savings (cycle outputs are already compact)`);
  }

  return jsonOutput;
}

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

runCycle({ json: jsonMode })
  .then(() => {
    if (!jsonMode) console.log(`\nReport written. Pass --json for machine-readable output.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Cycle failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
