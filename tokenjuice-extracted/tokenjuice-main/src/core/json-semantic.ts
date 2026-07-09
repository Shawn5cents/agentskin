/**
 * Tokenjuice: JSON Semantic Pruner (Phase 2)
 *
 * Ported from AgentSkin v5.0 (skin-engine.js) into Tokenjuice as a first-class
 * reducer. Reduces JSON API responses to a minimal markdown skin by:
 *   1. Smart passthrough for payloads below a size threshold
 *   2. Auto-classifying the source URL against built-in API rule families
 *   3. Recursively pruning the JSON tree to keep only signal-matched keys
 *   4. Applying semantic aliases (e.g. stargazers_count -> stars)
 *   5. Flattening to compact markdown key: value pairs
 *   6. Running a safety valve: if the skin is not smaller than the raw
 *      payload, return the raw JSON instead.
 */

import { createCompactionMetadata, createPassthroughCompactionMetadata, type CompactionKind, type CompactionMetadata } from "./compaction-metadata.js";

// ---------------------------------------------------------------------------
// Default signal keys
// ---------------------------------------------------------------------------

/**
 * Field names that are preserved by default because they almost always carry
 * semantic weight in JSON API responses. The single-letter keys (c, v, p)
 * match common abbreviated shorthand used by compact APIs.
 */
export const DEFAULT_SIGNAL_KEYS: readonly string[] = [
    'id', 'name', 'title', 'value', 'status', 'price', 'temp', 'wind',
    'description', 'url', 'link', 'published_at', 'text', 'code',
    'c', // count, count_*
    'v', // value, variant, volume
    'p',  // price, product, position
] as const;

// ---------------------------------------------------------------------------
// Built-in URL classification rules
// ---------------------------------------------------------------------------

export interface JsonSemanticUrlRule {
    id: string;
    family: string;
    description: string;
    match: {
        urlIncludes?: string[];
        urlIncludesAny?: string[];
    };
    signals: string[];
    aliases: Record<string, string>;
    priority: number;
}

/**
 * Built-in rule families. Each rule matches a URL pattern and provides
 * signals + aliases tailored to that API. The Tokenjuice port starts with
 * a focused subset (github + npm) that already produces >60% savings on
 * the AgentSkin benchmark suite.
 */
export const BUILTIN_URL_RULES: readonly JsonSemanticUrlRule[] = [
    {
        id: 'github/repos',
        family: 'github',
        description: 'GitHub repository API responses',
        match: { urlIncludes: ['api.github.com/repos/'] },
        signals: [
            'name', 'full_name', 'description', 'stargazers_count', 'language',
            'forks_count', 'open_issues_count', 'watchers_count', 'topics',
            'license', 'default_branch', 'created_at', 'updated_at', 'pushed_at',
            'size', 'archived', 'disabled',
        ],
        aliases: {
            stargazers_count: 'stars',
            forks_count: 'forks',
            open_issues_count: 'issues',
            watchers_count: 'watchers',
            full_name: 'repo',
            default_branch: 'branch',
        },
        priority: 100,
    },
    {
        id: 'github/users',
        family: 'github',
        description: 'GitHub user API responses',
        match: { urlIncludes: ['api.github.com/users/'] },
        signals: [
            'login', 'name', 'bio', 'company', 'location', 'email', 'blog',
            'public_repos', 'followers', 'following', 'created_at', 'type',
        ],
        aliases: { public_repos: 'repos', login: 'username', blog: 'website' },
        priority: 100,
    },
    {
        id: 'github/issues',
        family: 'github',
        description: 'GitHub issues API responses',
        match: { urlIncludes: ['api.github.com/repos/'], urlIncludesAny: ['/issues'] },
        signals: [
            'number', 'title', 'state', 'body', 'user', 'labels',
            'created_at', 'updated_at', 'closed_at', 'comments',
        ],
        aliases: { number: 'issue' },
        priority: 90,
    },
    {
        id: 'npm/registry',
        family: 'npm',
        description: 'npm registry package responses',
        match: { urlIncludes: ['registry.npmjs.org'] },
        signals: [
            'name', 'description', 'version', 'keywords', 'license', 'homepage',
            'repository', 'dependencies', 'devDependencies', 'dist-tags', 'time',
        ],
        aliases: { 'dist-tags': 'tags' },
        priority: 100,
    },
    {
        id: 'jsonplaceholder/posts',
        family: 'jsonplaceholder',
        description: 'JSONPlaceholder post responses',
        match: { urlIncludes: ['jsonplaceholder.typicode.com/posts'] },
        signals: ['id', 'title', 'body', 'userId'],
        aliases: { userId: 'user' },
        priority: 100,
    },
    {
        id: 'jsonplaceholder/users',
        family: 'jsonplaceholder',
        description: 'JSONPlaceholder user responses',
        match: { urlIncludes: ['jsonplaceholder.typicode.com/users'] },
        signals: ['id', 'name', 'username', 'email', 'phone', 'website', 'company', 'address', 'city'],
        aliases: { username: 'user' },
        priority: 100,
    },
    // --- AgentSkin port: GitHub Search ---
    {
        id: 'github/search',
        family: 'github',
        description: 'GitHub search API responses',
        match: { urlIncludes: ['api.github.com/search/'] },
        signals: ['total_count', 'incomplete_results', 'items'],
        aliases: { total_count: 'count', incomplete_results: 'partial' },
        priority: 95,
    },
    // --- AgentSkin port: GitHub Pull Requests ---
    {
        id: 'github/pulls',
        family: 'github',
        description: 'GitHub pull requests API responses',
        match: { urlIncludes: ['api.github.com/repos/'], urlIncludesAny: ['/pulls'] },
        signals: [
            'number', 'title', 'state', 'body', 'user', 'labels',
            'created_at', 'updated_at', 'merged_at', 'comments',
            'additions', 'deletions', 'changed_files',
        ],
        aliases: { number: 'pr' },
        priority: 90,
    },
    // --- AgentSkin port: Open-Meteo Weather ---
    {
        id: 'weather/open-meteo',
        family: 'weather',
        description: 'Open-Meteo weather API responses',
        match: { urlIncludes: ['api.open-meteo.com'] },
        signals: [
            'latitude', 'longitude', 'timezone', 'current', 'current_units',
            'daily', 'daily_units', 'temperature_2m', 'relative_humidity_2m',
            'apparent_temperature', 'precipitation', 'wind_speed_10m',
            'weather_code', 'time', 'temperature_2m_max', 'temperature_2m_min',
        ],
        aliases: {
            temperature_2m: 'temp',
            wind_speed_10m: 'wind',
            relative_humidity_2m: 'humidity',
            apparent_temperature: 'feels_like',
        },
        priority: 100,
    },
    // --- AgentSkin port: HackerNews ---
    {
        id: 'hackernews/item',
        family: 'hackernews',
        description: 'HackerNews item API responses',
        match: { urlIncludes: ['hacker-news.firebaseio.com'] },
        signals: ['id', 'title', 'url', 'score', 'by', 'time', 'type', 'descendants', 'text', 'kids'],
        aliases: { by: 'author', descendants: 'comments', score: 'points' },
        priority: 100,
    },
    // --- AgentSkin port: Reddit ---
    {
        id: 'reddit/post',
        family: 'reddit',
        description: 'Reddit post API responses',
        match: { urlIncludesAny: ['reddit.com', 'oauth.reddit.com'] },
        signals: [
            'title', 'author', 'score', 'num_comments', 'url', 'selftext',
            'created_utc', 'subreddit', 'permalink', 'name', 'id',
        ],
        aliases: { num_comments: 'comments', score: 'points', selftext: 'body' },
        priority: 90,
    },
] as const;

// ---------------------------------------------------------------------------
// URL rule matching
// ---------------------------------------------------------------------------

function scoreUrlRule(rule: JsonSemanticUrlRule, url: string): number {
    const urlLower = url.toLowerCase();
    let score = 0;

    if (rule.match.urlIncludes) {
        const allMatch = rule.match.urlIncludes.every(p => urlLower.includes(p.toLowerCase()));
        if (!allMatch) return 0;
        score += rule.match.urlIncludes.length * 100;
    }

    if (rule.match.urlIncludesAny) {
        const anyMatch = rule.match.urlIncludesAny.some(p => urlLower.includes(p.toLowerCase()));
        if (!anyMatch) return 0;
        score += 50;
    }

    score += rule.priority;
    return score;
}

/**
 * Find the best matching built-in URL rule, or null if no rule matches.
 */
export function findUrlRule(url: string): JsonSemanticUrlRule | null {
    if (!url || typeof url !== 'string') return null;
    let bestRule: JsonSemanticUrlRule | null = null;
    let bestScore = 0;
    for (const rule of BUILTIN_URL_RULES) {
        const score = scoreUrlRule(rule, url);
        if (score > bestScore) {
            bestScore = score;
            bestRule = rule;
        }
    }
    return bestRule;
}

// ---------------------------------------------------------------------------
// Recursive prune
// ---------------------------------------------------------------------------

/**
 * Recursively prune data to only retain signal-matched keys.
 *
 * - Arrays: map each item through pruneJson and drop null results
 * - Objects: keep keys whose name (or alias target) is in signalKeys,
 *            recurse into non-matching object/array values
 * - Primitives: pass through
 *
 * Returns null when an object has no signal matches (caller uses this to
 * drop entire subtrees).
 */
export function pruneJson(
    data: unknown,
    requiredKeys: readonly string[] = [],
    aliases: Record<string, string> = {},
): unknown {
    const signalKeys = new Set<string>(
        [...DEFAULT_SIGNAL_KEYS, ...requiredKeys].map(k => k.toLowerCase()),
    );

    // Add alias TARGET keys to signalKeys so remapped keys survive pruning.
    // e.g. alias { stargazers_count: "stars" } => "stars" becomes a signal.
    for (const target of Object.values(aliases)) {
        signalKeys.add(target.toLowerCase());
    }
    if (Array.isArray(data)) {
        const out = data
            .map(item => pruneJson(item, requiredKeys, aliases))
            .filter(item => item !== null && item !== undefined);
        return out;
    }

    if (typeof data === 'object' && data !== null) {
        const pruned: Record<string, unknown> = {};
        let hasSignal = false;
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            const lowerKey = key.toLowerCase();
            const targetKey = aliases[lowerKey] ?? aliases[key] ?? key;

            if (signalKeys.has(lowerKey) || signalKeys.has(targetKey.toLowerCase())) {
                pruned[targetKey] = value;
                hasSignal = true;
            } else if (typeof value === 'object' && value !== null) {
                const subPruned = pruneJson(value, requiredKeys, aliases);
                if (subPruned && typeof subPruned === 'object' && !Array.isArray(subPruned)
                    && Object.keys(subPruned as object).length > 0) {
                    pruned[key] = subPruned;
                    hasSignal = true;
                }
            }
        }
        return hasSignal ? pruned : null;
    }

    return data;
}

// ---------------------------------------------------------------------------
// Markdown flatten
// ---------------------------------------------------------------------------

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'string') return value;
    // For objects: flattenJson recurses into objects, so formatValue only
    // sees primitives. JSON.stringify is a safety net for unexpected shapes.
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/**
 * Convert pruned data into a compact markdown skin.
 * Output format:
 *   [title]            (only when rawDataSize > 500)
 *   key: value
 *   parent.child: value
 *   arr.0.key: value
 */
export function flattenJson(
    pruned: unknown,
    title: string = '',
    rawDataSize: number = 0,
): string {
    let output = '';
    if (title && rawDataSize > 500) {
        output += `[${title}]\n`;
    }

    const flatten = (obj: unknown, indent: string = ''): void => {
        if (Array.isArray(obj)) {
            obj.forEach(item => flatten(item, indent));
            return;
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
                if (typeof v === 'object' && v !== null) {
                    flatten(v, indent + `${k}.`);
                } else {
                    output += `${indent}${k}: ${formatValue(v)}\n`;
                }
            }
            return;
        }
        output += `${indent}${obj}\n`;
    };

    flatten(pruned);
    return output.trim();
}

// ---------------------------------------------------------------------------
// ANSI stripping
// ---------------------------------------------------------------------------

const ANSI_CSI_PATTERN = /\x1b\[[\d;]*[\x20-\x7e]/gu;
const ANSI_OSC_PATTERN = /\x1b\].*?(?:\x07|\x1b\\)/gu;
const ANSI_INCOMPLETE_PATTERN = /\x1b(?:\[[\d;]*|\][^\x07\x1b\\]*)?$/gu;
const ANSI_SINGLE_PATTERN = /\x1b[\x40-\x5F]/gu;

function stripAnsi(text: string): string {
    if (typeof text !== 'string') return text;
    return text
        .replaceAll(ANSI_OSC_PATTERN, '')
        .replaceAll(ANSI_CSI_PATTERN, '')
        .replaceAll(ANSI_INCOMPLETE_PATTERN, '')
        .replaceAll(ANSI_SINGLE_PATTERN, '')
        .replaceAll(/\u001b/g, '');
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/**
 * Grapheme-aware token estimation. ~3.5 chars per token.
 * Falls back to length/4 if Intl.Segmenter is not available.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    if (typeof Seg === 'function') {
        try {
            const segments = new Seg('en', { granularity: 'grapheme' }).segment(text);
            return Math.ceil(Array.from(segments, s => s.segment).length / 3.5);
        } catch {
            // fall through
        }
    }
    return Math.ceil(text.length / 3.5);
}

/**
 * Fast token estimation using the length/4 heuristic.
 */
export function estimateTokensFast(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export interface JsonSemanticOptions {
    url?: string;
    signals?: string[];
    aliases?: Record<string, string>;
    title?: string;
    stripAnsiCodes?: boolean;
    smallThreshold?: number;
}

export interface JsonSemanticResult {
    skin: string;
    metrics: {
        applied: boolean;
        reason?: string;
        raw_chars: number;
        skin_chars: number;
        raw_est_tokens?: number;
        skin_est_tokens?: number;
        savings_ratio?: string;
    };
    compaction: CompactionMetadata;
    rule: { id: string; family: string; description: string } | null;
}

/**
 * Apply JSON semantic pruning to raw data.
 *
 * Pipeline:
 *   1. Smart passthrough when raw size <= smallThreshold
 *   2. Auto-classify URL against BUILTIN_URL_RULES (if signals not provided)
 *   3. Strip ANSI from raw JSON
 *   4. Recursive prune with signals + aliases
 *   5. Flatten to markdown
 *   6. Safety valve: if skin is not smaller than raw, return raw
 */
export function applyJsonSemantic(
    rawData: unknown,
    options: JsonSemanticOptions = {},
): JsonSemanticResult {
    const {
        url = '',
        signals: userSignals = [],
        aliases: userAliases = {},
        title = '',
        stripAnsiCodes = true,
        smallThreshold = 300,
    } = options;

    const rawJson = JSON.stringify(rawData);
    const rawSize = rawJson.length;

    // 1. Smart passthrough
    if (rawSize <= smallThreshold) {
        return {
            skin: rawJson,
            metrics: { applied: false, reason: 'below-threshold', raw_chars: rawSize, skin_chars: rawSize },
            compaction: createPassthroughCompactionMetadata('small-passthrough'),
            rule: null,
        };
    }

    // 2. Auto-classify URL
    let signals = userSignals;
    let aliases: Record<string, string> = { ...userAliases };
    let matchedRule: { id: string; family: string; description: string } | null = null;
    if (url && userSignals.length === 0) {
        const classified = findUrlRule(url);
        if (classified) {
            signals = classified.signals;
            aliases = { ...classified.aliases, ...userAliases };
            matchedRule = { id: classified.id, family: classified.family, description: classified.description };
        }
    }

    // 3. Strip ANSI
    let processedRaw = rawJson;
    if (stripAnsiCodes) {
        processedRaw = stripAnsi(rawJson);
    }

    // Parse after ANSI strip
    let data: unknown = rawData;
    if (processedRaw !== rawJson) {
        try {
            data = JSON.parse(processedRaw);
        } catch {
            // Use original if parse fails
        }
    }

    // 4. Prune
    const pruned = pruneJson(data, signals, aliases);
    if (pruned === null) {
        return {
            skin: '',
            metrics: { applied: false, reason: 'no-signals-matched', raw_chars: rawSize, skin_chars: 0 },
            compaction: createPassthroughCompactionMetadata('raw-passthrough'),
            rule: matchedRule,
        };
    }

    // 5. Flatten
    const skinText = flattenJson(pruned, title, rawSize);

    // 6. Safety valve
    if (skinText.length >= rawSize) {
        return {
            skin: rawJson,
            metrics: {
                applied: false,
                reason: 'skin-larger-than-raw',
                raw_chars: rawSize,
                skin_chars: skinText.length,
            },
            compaction: createPassthroughCompactionMetadata('raw-passthrough'),
            rule: matchedRule,
        };
    }

    const rawTokens = estimateTokensFast(rawJson);
    const skinTokens = estimateTokensFast(skinText);
    const savings = 1 - (skinTokens / rawTokens);

    const kinds: CompactionKind[] = ['signal-prune', 'alias-remap'];
    if (matchedRule) kinds.push('rule-auto-classify');

    return {
        skin: skinText,
        metrics: {
            applied: true,
            raw_chars: rawSize,
            skin_chars: skinText.length,
            raw_est_tokens: Math.ceil(rawTokens),
            skin_est_tokens: Math.ceil(skinTokens),
            savings_ratio: (savings * 100).toFixed(2) + '%',
        },
        compaction: createCompactionMetadata(...kinds),
        rule: matchedRule,
    };
}
