import crypto from 'node:crypto';

import {
  recursive_prune,
  skin,
  stripAnsi,
  countTextChars
} from '../backend/lib/skin-engine.js';

const githubFixture = {
  name: 'demo',
  full_name: 'acme/demo',
  description: 'demo repo',
  stargazers_count: 42,
  language: 'JavaScript',
  forks_count: 7,
  junk: Array.from({ length: 40 }, (_, i) => ({
    id: i,
    url: `https://junk.invalid/${i}`,
    secret: `drop-${i}`
  })),
  owner: {
    id: 99,
    url: 'https://api.github.com/users/acme',
    avatar_url: 'https://junk.invalid/avatar'
  }
};

const explicitFixture = {
  name: 'alpha',
  value: 42,
  secret: 'drop-me',
  nested: {
    name: 'nested-name',
    value: 7,
    secret: 'drop-nested'
  }
};

const github = skin(githubFixture, {
  url: 'https://api.github.com/repos/acme/demo',
  smallThreshold: 0
});
const explicit = skin(explicitFixture, {
  signals: ['name', 'value'],
  smallThreshold: 0
});
const fallback = recursive_prune({
  id: 7,
  url: 'https://example.com',
  secret: 'drop-me'
});

const result = {
  schema_version: 1,
  workload: 'agentskin__core-v51',
  checks: {
    github_rule_id: github.rule?.id ?? null,
    github_authoritative: github.compaction.authoritative,
    github_applied: github.metrics.applied,
    github_contains_stars: github.skin.includes('stars: 42'),
    github_excludes_junk: !github.skin.includes('junk.invalid') && !github.skin.includes('junk.'),
    explicit_applied: explicit.metrics.applied,
    explicit_contains_name: explicit.skin.includes('name: alpha'),
    explicit_contains_value: explicit.skin.includes('value: 42'),
    explicit_excludes_secret: !explicit.skin.includes('secret'),
    fallback_exact: JSON.stringify(fallback) === JSON.stringify({
      id: 7,
      url: 'https://example.com'
    }),
    ansi_strip_exact: stripAnsi('\u001b[31mHello\u001b[0m World') === 'Hello World',
    grapheme_count: countTextChars('A😀你')
  },
  metrics: {
    github_raw_chars: github.metrics.raw_chars,
    github_skin_chars: github.metrics.skin_chars,
    github_savings_ratio: github.metrics.savings_ratio,
    explicit_raw_chars: explicit.metrics.raw_chars,
    explicit_skin_chars: explicit.metrics.skin_chars,
    explicit_savings_ratio: explicit.metrics.savings_ratio
  },
  outputs: {
    github_skin: github.skin,
    explicit_skin: explicit.skin,
    fallback
  }
};

const requiredTrue = [
  'github_authoritative',
  'github_applied',
  'github_contains_stars',
  'github_excludes_junk',
  'explicit_applied',
  'explicit_contains_name',
  'explicit_contains_value',
  'explicit_excludes_secret',
  'fallback_exact',
  'ansi_strip_exact'
];

for (const key of requiredTrue) {
  if (result.checks[key] !== true) {
    throw new Error(`failed check: ${key}`);
  }
}
if (result.checks.github_rule_id !== 'github/repos') {
  throw new Error(`unexpected GitHub rule: ${result.checks.github_rule_id}`);
}
if (result.checks.grapheme_count !== 3) {
  throw new Error(`unexpected grapheme count: ${result.checks.grapheme_count}`);
}

const payload = JSON.stringify(result, null, 2) + '\n';
process.stdout.write(payload);
process.stderr.write(
  `AGENTSKIN_CORE_SHA256=${crypto.createHash('sha256').update(payload).digest('hex')}\n`
);
