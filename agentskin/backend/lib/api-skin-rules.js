/**
 * AgentSkin: API Skin Rules v1.1
 * Rule-driven auto-classification for common API endpoints.
 * Inspired by Tokenjuice's rule-based command classification.
 *
 * 3-Layer Rule Resolution (highest priority wins):
 *   1. Project:  <projectRoot>/.agentskin/signals.json
 *   2. User:     ~/.config/agentskin/signals.json
 *   3. Builtin:  the BUILTIN_RULES array below
 *
 * Override semantics: a rule in a higher layer with the same `id` replaces
 * the lower-layer rule entirely. A rule with `"disabled": true` removes the
 * matching lower-layer rule. Rules with new `id` values are appended.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';
import { homedir } from 'node:os';

// Cache for layered rule resolution. Cleared by clearRuleCache().
let _ruleCache = null;

/**
 * @typedef {Object} ApiSkinRule
 * @property {string} id - Unique rule identifier
 * @property {string} family - API domain family (github, stripe, etc.)
 * @property {string} description - Human-readable description
 * @property {Object} match - URL pattern matching criteria
 * @property {string[]} [match.urlIncludes] - URL must contain all of these
 * @property {string[]} [match.urlIncludesAny] - URL must contain at least one of these
 * @property {string[]} signals - Signal keys to preserve
 * @property {Object} aliases - Key alias mappings
 * @property {Object} [transforms] - Optional transformation flags
 * @property {number} [priority] - Higher = more specific match
 */

/** @type {ApiSkinRule[]} */
const BUILTIN_RULES = [
  // --- GitHub ---
  {
    id: 'github/repos',
    family: 'github',
    description: 'GitHub repository API responses',
    match: { urlIncludes: ['api.github.com/repos/'] },
    signals: ['name', 'full_name', 'description', 'stargazers_count', 'language', 'forks_count', 'open_issues_count', 'watchers_count', 'topics', 'license', 'default_branch', 'created_at', 'updated_at', 'pushed_at', 'size', 'archived', 'disabled'],
    aliases: { stargazers_count: 'stars', forks_count: 'forks', open_issues_count: 'issues', watchers_count: 'watchers', full_name: 'repo', default_branch: 'branch' },
    transforms: { flattenLicense: true, stripNull: true },
    priority: 100,
  },
  {
    id: 'github/users',
    family: 'github',
    description: 'GitHub user API responses',
    match: { urlIncludes: ['api.github.com/users/'] },
    signals: ['login', 'name', 'bio', 'company', 'location', 'email', 'blog', 'public_repos', 'followers', 'following', 'created_at', 'type'],
    aliases: { public_repos: 'repos', login: 'username', blog: 'website' },
    transforms: { stripNull: true },
    priority: 100,
  },
  {
    id: 'github/issues',
    family: 'github',
    description: 'GitHub issues API responses',
    match: { urlIncludes: ['api.github.com/repos/'], urlIncludesAny: ['/issues'] },
    signals: ['number', 'title', 'state', 'body', 'user', 'labels', 'created_at', 'updated_at', 'closed_at', 'comments'],
    aliases: { number: 'issue' },
    transforms: { stripNull: true },
    priority: 90,
  },
  {
    id: 'github/search',
    family: 'github',
    description: 'GitHub search API responses',
    match: { urlIncludes: ['api.github.com/search/'] },
    signals: ['total_count', 'incomplete_results', 'items'],
    aliases: { total_count: 'count', incomplete_results: 'partial' },
    transforms: { stripNull: true },
    priority: 95,
  },
  {
    id: 'github/pulls',
    family: 'github',
    description: 'GitHub pull requests API responses',
    match: { urlIncludes: ['api.github.com/repos/'], urlIncludesAny: ['/pulls'] },
    signals: ['number', 'title', 'state', 'body', 'user', 'labels', 'created_at', 'updated_at', 'merged_at', 'comments', 'additions', 'deletions', 'changed_files'],
    aliases: { number: 'pr' },
    transforms: { stripNull: true },
    priority: 90,
  },

  // --- Weather ---
  {
    id: 'weather/open-meteo',
    family: 'weather',
    description: 'Open-Meteo weather API responses',
    match: { urlIncludes: ['api.open-meteo.com'] },
    signals: ['latitude', 'longitude', 'timezone', 'current', 'current_units', 'daily', 'daily_units', 'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation', 'wind_speed_10m', 'weather_code', 'time', 'temperature_2m_max', 'temperature_2m_min'],
    aliases: { temperature_2m: 'temp', wind_speed_10m: 'wind', relative_humidity_2m: 'humidity', apparent_temperature: 'feels_like' },
    transforms: { stripNull: true },
    priority: 100,
  },

  // --- News / Content ---
  {
    id: 'hackernews/item',
    family: 'hackernews',
    description: 'HackerNews item API responses',
    match: { urlIncludes: ['hacker-news.firebaseio.com'] },
    signals: ['id', 'title', 'url', 'score', 'by', 'time', 'type', 'descendants', 'text', 'kids'],
    aliases: { by: 'author', descendants: 'comments', score: 'points' },
    transforms: { stripNull: true },
    priority: 100,
  },

  // --- REST API Generics ---
  {
    id: 'jsonplaceholder/posts',
    family: 'jsonplaceholder',
    description: 'JSONPlaceholder post responses',
    match: { urlIncludes: ['jsonplaceholder.typicode.com/posts'] },
    signals: ['id', 'title', 'body', 'userId'],
    aliases: { userId: 'user' },
    transforms: { stripNull: true },
    priority: 100,
  },
  {
    id: 'jsonplaceholder/users',
    family: 'jsonplaceholder',
    description: 'JSONPlaceholder user responses',
    match: { urlIncludes: ['jsonplaceholder.typicode.com/users'] },
    signals: ['id', 'name', 'username', 'email', 'phone', 'website', 'company', 'address', 'city'],
    aliases: { username: 'user' },
    transforms: { stripNull: true },
    priority: 100,
  },

  // --- npm registry ---
  {
    id: 'npm/registry',
    family: 'npm',
    description: 'npm registry package responses',
    match: { urlIncludes: ['registry.npmjs.org'] },
    signals: ['name', 'description', 'version', 'keywords', 'license', 'homepage', 'repository', 'dependencies', 'devDependencies', 'dist-tags', 'time'],
    aliases: { 'dist-tags': 'tags' },
    transforms: { stripNull: true },
    priority: 100,
  },

  // --- Reddit ---
  {
    id: 'reddit/post',
    family: 'reddit',
    description: 'Reddit post API responses',
    match: { urlIncludesAny: ['reddit.com', 'oauth.reddit.com'] },
    signals: ['title', 'author', 'score', 'num_comments', 'url', 'selftext', 'created_utc', 'subreddit', 'permalink', 'name', 'id'],
    aliases: { num_comments: 'comments', score: 'points', selftext: 'body' },
    transforms: { stripNull: true },
    priority: 90,
  },
];

/**
 * Score how well a rule matches a URL.
 * Returns a numeric score (higher = better match) or 0 if no match.
 */
function scoreRule(rule, url) {
  const urlLower = url.toLowerCase();
  let score = 0;

  // Check urlIncludes (AND logic)
  if (rule.match.urlIncludes) {
    const allMatch = rule.match.urlIncludes.every(pattern => urlLower.includes(pattern.toLowerCase()));
    if (!allMatch) return 0;
    score += rule.match.urlIncludes.length * 100;
  }

  // Check urlIncludesAny (OR logic)
  if (rule.match.urlIncludesAny) {
    const anyMatch = rule.match.urlIncludesAny.some(pattern => urlLower.includes(pattern.toLowerCase()));
    if (!anyMatch) return 0;
    score += 50;
  }

  // Add rule priority bonus
  score += (rule.priority || 0);

  return score;
}

/**
 * Find the best matching rule for a given URL.
 * Returns the rule with signals and aliases, or null if no match.
 *
 * @param {string} url
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot] - Directory to look for .agentskin/signals.json
 * @param {boolean} [opts.useLayeredConfig=true] - Whether to merge user/project layers
 * @returns {ApiSkinRule|null}
 */
export function findMatchingRule(url, opts = {}) {
  const { useLayeredConfig = true, projectRoot } = opts;
  const rules = useLayeredConfig ? getAllRules({ projectRoot }) : BUILTIN_RULES;

  let bestRule = null;
  let bestScore = 0;

  for (const rule of rules) {
    const score = scoreRule(rule, url);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestRule;
}

/**
 * Safely read a JSON file and return its `rules` array, or [] on any failure.
 * Missing files, parse errors, and non-array `rules` all return []. Errors are
 * not thrown because a missing config file is the normal case.
 */
function _readRulesFile(filePath) {
  if (!filePath) return [];
  const resolved = isAbsolute(filePath) ? filePath : resolve(filePath);
  if (!existsSync(resolved)) return [];
  let raw;
  try {
    raw = readFileSync(resolved, 'utf8');
  } catch {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.rules)) return [];
  // Validate each rule has the minimum shape; drop invalid entries silently.
  // A rule is valid if it has an id AND (either a `match` clause or a
  // `disabled: true` directive). Disable directives don't need a match.
  return parsed.rules.filter(r => {
    if (!r || typeof r.id !== 'string') return false;
    if (r.disabled === true) return true;
    return !!r.match;
  });
}

/**
 * Resolve the user config path: $XDG_CONFIG_HOME/agentskin/signals.json or
 * $HOME/.config/agentskin/signals.json.
 */
function _userConfigPath() {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.config');
  return join(base, 'agentskin', 'signals.json');
}

/**
 * Resolve the project config path: <projectRoot>/.agentskin/signals.json.
 * Returns null if projectRoot is not provided.
 */
function _projectConfigPath(projectRoot) {
  if (!projectRoot) return null;
  return join(resolve(projectRoot), '.agentskin', 'signals.json');
}

/**
 * Load user-layer rules from ~/.config/agentskin/signals.json (or XDG equivalent).
 * @returns {ApiSkinRule[]}
 */
export function loadUserRules() {
  return _readRulesFile(_userConfigPath());
}

/**
 * Load project-layer rules from <projectRoot>/.agentskin/signals.json.
 * @param {string} [projectRoot] - Defaults to process.cwd() when omitted
 * @returns {ApiSkinRule[]}
 */
export function loadProjectRules(projectRoot) {
  const root = projectRoot || process.cwd();
  return _readRulesFile(_projectConfigPath(root));
}

/**
 * Merge rule layers with override semantics.
 *
 * Order: builtin < user < project (highest priority wins).
 *   - A rule in a higher layer with the same `id` REPLACES the lower-layer rule.
 *   - A rule with `disabled: true` REMOVES the matching lower-layer rule.
 *   - Rules with new `id` values are APPENDED.
 *
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot]
 * @returns {ApiSkinRule[]}
 */
export function mergeRuleLayers({ projectRoot } = {}) {
  const builtin = BUILTIN_RULES;
  const user = loadUserRules();
  const project = loadProjectRules(projectRoot);

  // Build a map of disabled IDs (set in higher layers).
  const disabled = new Set();
  for (const layer of [user, project]) {
    for (const r of layer) {
      if (r.disabled) disabled.add(r.id);
    }
  }

  // Build a map of overrides (id -> rule from highest layer that has it).
  // Skip overrides whose id is disabled in ANY layer — the rule is gone entirely.
  const overrides = new Map();
  for (const layer of [user, project]) {
    for (const r of layer) {
      if (!r.disabled && r.id && !disabled.has(r.id)) overrides.set(r.id, r);
    }
  }

  // Start with builtin, drop disabled, apply overrides.
  const merged = [];
  for (const r of builtin) {
    if (disabled.has(r.id)) continue;
    merged.push(overrides.get(r.id) || r);
    overrides.delete(r.id);
  }
  // Append remaining overrides (new rules not in builtin).
  for (const r of overrides.values()) {
    merged.push(r);
  }
  return merged;
}

/**
 * Get the effective rule set for classification. Caches per projectRoot to
 * avoid re-reading files on every findMatchingRule() call.
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot]
 * @returns {ApiSkinRule[]}
 */
export function getAllRules(opts = {}) {
  const key = opts.projectRoot ? resolve(opts.projectRoot) : '__default__';
  if (!_ruleCache || _ruleCache.key !== key) {
    _ruleCache = { key, rules: mergeRuleLayers(opts) };
  }
  return _ruleCache.rules;
}

/**
 * Clear the rule cache. Useful for tests or when config files change at runtime.
 */
export function clearRuleCache() {
  _ruleCache = null;
}

/**
 * Get the resolved file paths for the user and project config layers.
 * Useful for documentation, error messages, and `agentskin config --show`.
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot]
 * @returns {{ userPath: string, projectPath: string|null }}
 */
export function getConfigPaths(opts = {}) {
  return {
    userPath: _userConfigPath(),
    projectPath: opts.projectRoot ? _projectConfigPath(opts.projectRoot) : null,
  };
}

/**
 * Get all builtin rules (for introspection/testing). Returns a shallow copy so
 * callers cannot mutate the canonical list.
 */
export function getBuiltinRules() {
  return BUILTIN_RULES.map(r => ({ ...r }));
}

/**
 * Get rules by family name.
 */
export function getRulesByFamily(family) {
  return BUILTIN_RULES.filter(r => r.family === family);
}

/**
 * Get all available rule families.
 */
export function getFamilies() {
  return [...new Set(BUILTIN_RULES.map(r => r.family))];
}
