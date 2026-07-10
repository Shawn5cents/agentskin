import { skinReasoning } from './reasoning-skin.js';
import { estimateTokens, estimateTokensFast, stripAnsi, isBelowSkinThreshold, countTextChars } from './text-utils.js';
import { findMatchingRule } from './api-skin-rules.js';

/**
 * AgentSkin: Master Semantic Engine (v5.0.0)
 * Open Protocol for Recursive Object Pruning.
 * Enhanced with Tokenjuice patterns: grapheme-aware counting, ANSI stripping,
 * API rule auto-classification, smart passthrough, and compaction metadata.
 */

// Re-export for consumers
export { skinReasoning };
export { stripAnsi, estimateTokens, countTextChars } from './text-utils.js';
export { findMatchingRule, getBuiltinRules, getRulesByFamily, getFamilies } from './api-skin-rules.js';

// Default signal keys: commonly-used semantic field names preserved by default
// Single-letter keys (c, v, p) map to common abbreviated API response fields:
//   c = count, v = value, p = price/product
// User-provided signals are always added via the signals parameter
const DEFAULT_SIGNAL_KEYS = [
    'id', 'name', 'title', 'value', 'status', 'price', 'temp', 'wind',
    'description', 'url', 'link', 'published_at', 'text', 'code',
    // Abbreviated keys for common API responses
    'c',  // count, count_*, common abbreviated field
    'v',  // value, variant, volume
    'p'   // price, product, position
];

/**
 * Recursively prune data to only retain signal-matched keys.
 * @param {*} data - Input data (object, array, or primitive)
 * @param {string[]} requiredKeys - Additional signal keys to preserve
 * @param {Object} aliases - Key rename map (original -> signal)
 * @param {boolean} applyReasoningSkin - Whether to run skinReasoning on string values
 * @returns {*} Pruned data, or null if no signals matched
 */
export const recursive_prune = (data, requiredKeys = [], aliases = {}, applyReasoningSkin = false) => {
    const signalKeys = [...new Set([...DEFAULT_SIGNAL_KEYS, ...requiredKeys])];
    
    if (Array.isArray(data)) {
        return data.map(item => recursive_prune(item, requiredKeys, aliases, applyReasoningSkin)).filter(Boolean);
    }
    
    if (typeof data === 'object' && data !== null) {
        const pruned = {};
        let hasSignal = false;
        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();
            const targetKey = aliases[lowerKey] || aliases[key] || key;
            
            if (signalKeys.includes(lowerKey) || signalKeys.includes(targetKey.toLowerCase())) {
                let processedValue = value;
                if (applyReasoningSkin && typeof value === 'string') {
                    const { skin } = skinReasoning(value);
                    processedValue = skin;
                }
                pruned[targetKey] = processedValue;
                hasSignal = true;
            } else if (typeof value === 'object') {
                const subPruned = recursive_prune(value, requiredKeys, aliases, applyReasoningSkin);
                if (subPruned && Object.keys(subPruned).length > 0) {
                    pruned[key] = subPruned;
                    hasSignal = true;
                }
            }
        }
        return hasSignal ? pruned : null;
    }
    
    return data;
};

/**
 * Convert pruned data into a compact markdown skin.
 * @param {*} prunedData - Already-pruned data
 * @param {string} title - Optional title (only shown for data > 500 bytes)
 * @param {number} rawDataSize - Original raw data byte size
 * @returns {string} Markdown-formatted skin
 */
export const to_markdown_skin = (prunedData, title = "", rawDataSize = 0) => {
    let output = "";
    // Only add title if it doesn't break the token budget for tiny data
    if (title && rawDataSize > 500) output += `[${title}]\n`;
    
    const flatten = (obj, indent = "") => {
        if (Array.isArray(obj)) {
            obj.forEach(item => flatten(item, indent));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'object') {
                    flatten(v, indent + `${k}.`);
                } else {
                    output += `${indent}${k}: ${v}\n`;
                }
            }
        } else {
            output += `${indent}${obj}\n`;
        }
    };

    flatten(prunedData);
    return output.trim();
};

/**
 * Auto-classify a URL and return matching signals/aliases from API skin rules.
 * @param {string} url - The URL to classify
 * @returns {Object|null} Object with { signals, aliases, rule } or null if no match
 */
export const classify_url = (url) => {
    const rule = findMatchingRule(url);
    if (!rule) return null;
    return {
        signals: rule.signals,
        aliases: rule.aliases || {},
        rule: { id: rule.id, family: rule.family, description: rule.description }
    };
};

/**
 * Compaction metadata types (ported from Tokenjuice's compaction-metadata.ts).
 * Tracks what kind of compaction was applied and whether the output is authoritative.
 */

/** @typedef {'signal-prune'|'alias-remap'|'reasoning-skin'|'ansi-strip'|'small-passthrough'|'rule-auto-classify'|'raw-passthrough'} CompactionKind */

/**
 * Build compaction metadata for a skinning operation.
 * @param {boolean} authoritative - Whether the skin captures all requested data
 * @param {CompactionKind[]} kinds - What compaction strategies were applied
 * @returns {{ authoritative: boolean, kinds: CompactionKind[] }}
 */
export const createCompactionMetadata = (authoritative, ...kinds) => ({
    authoritative,
    kinds: [...new Set(kinds.filter(Boolean))]
});

/**
 * Merge multiple compaction metadata records.
 * authoritative is true only if ALL records are authoritative.
 */
export const mergeCompactionMetadata = (...values) => {
    const valid = values.filter(v => v && v.kinds && v.kinds.length > 0);
    if (valid.length === 0) return { authoritative: false, kinds: [] };
    return {
        authoritative: valid.every(v => v.authoritative),
        kinds: [...new Set(valid.flatMap(v => v.kinds))]
    };
};

/**
 * Enhanced analyze_compression with grapheme-aware token estimation.
 * Falls back to the fast length/4 heuristic for backward compatibility.
 * @param {*} rawJson - The original data object
 * @param {string} skinText - The skin text output
 * @param {Object} [options] - Options
n * @param {boolean} [options.graphemeAware=false] - Use grapheme-aware counting
 * @returns {{ raw_est_tokens: number, skin_est_tokens: number, savings_ratio: string, applied: boolean, compaction: Object }}
 */
export const analyze_compression = (rawJson, skinText, options = {}) => {
    const rawStr = JSON.stringify(rawJson);
    const useGrapheme = options.graphemeAware || false;
    
    const rawTokens = useGrapheme ? estimateTokens(rawStr) : estimateTokensFast(rawStr);
    const skinTokens = useGrapheme ? estimateTokens(skinText) : estimateTokensFast(skinText);
    
    // Safety Valve: If Skin is bigger or nearly equal, return 0 savings
    if (skinText.length >= rawStr.length) {
        return {
            raw_est_tokens: Math.ceil(rawTokens),
            skin_est_tokens: Math.ceil(rawTokens),
            savings_ratio: "0.00%",
            applied: false,
            compaction: createCompactionMetadata(false, 'raw-passthrough')
        };
    }
    
    const savings = 1 - (skinTokens / rawTokens);
    return {
        raw_est_tokens: Math.ceil(rawTokens),
        skin_est_tokens: Math.ceil(skinTokens),
        savings_ratio: (savings * 100).toFixed(2) + "%",
        applied: true,
        compaction: createCompactionMetadata(true, 'signal-prune', 'alias-remap')
    };
};

/**
 * Main skin pipeline: fetch, prune, format, with smart passthrough and auto-classification.
 * @param {*} rawData - The raw API response data
 * @param {Object} [options] - Pipeline options
 * @param {string} [options.url] - Source URL (for auto-classification)
 * @param {string[]} [options.signals] - Signal keys to preserve
 * @param {Object} [options.aliases] - Key alias mappings
 * @param {boolean} [options.applyReasoning] - Whether to apply reasoning skin to string values
 * @param {boolean} [options.stripAnsi=true] - Whether to strip ANSI codes from the raw data
 * @param {string} [options.title] - Title for the skin output
 * @param {number} [options.smallThreshold=300] - Character threshold for smart passthrough
 * @returns {{ skin: string, metrics: Object, compaction: Object, rule: Object|null }}
 */
export const skin = (rawData, options = {}) => {
    const {
        url = '',
        signals: userSignals = [],
        aliases: userAliases = {},
        applyReasoning = false,
        stripAnsiCodes = true,
        title = '',
        smallThreshold = 300
    } = options;

    const rawJson = JSON.stringify(rawData);

    // Smart passthrough: skip skinning for tiny payloads
    if (isBelowSkinThreshold(rawJson, smallThreshold)) {
        return {
            skin: rawJson,
            metrics: { applied: false, reason: 'below-threshold', raw_chars: rawJson.length, skin_chars: rawJson.length },
            compaction: createCompactionMetadata(false, 'small-passthrough'),
            rule: null
        };
    }

    // Auto-classify URL if no signals provided
    let signals = userSignals;
    let aliases = userAliases;
    let matchedRule = null;
    if (url && userSignals.length === 0) {
        const classified = classify_url(url);
        if (classified) {
            signals = classified.signals;
            aliases = { ...classified.aliases, ...userAliases };
            matchedRule = classified.rule;
        }
    }

    // Strip ANSI from the raw JSON string if needed
    let processedRaw = rawJson;
    if (stripAnsiCodes) {
        processedRaw = stripAnsi(rawJson);
    }

    // Parse and prune
    let data = rawData;
    try {
        if (typeof processedRaw === 'string' && processedRaw !== rawJson) {
            data = JSON.parse(processedRaw);
        }
    } catch {
        // If parse fails after ANSI stripping, use original data
    }

    const pruned = recursive_prune(data, signals, aliases, applyReasoning);
    if (!pruned) {
        return {
            skin: '',
            metrics: { applied: false, reason: 'no-signals-matched', raw_chars: rawJson.length, skin_chars: 0 },
            compaction: createCompactionMetadata(false, 'raw-passthrough'),
            rule: matchedRule
        };
    }

    const skinText = to_markdown_skin(pruned, title, rawJson.length);

    // Build compaction metadata
    const kinds = ['signal-prune', 'alias-remap'];
    if (applyReasoning) kinds.push('reasoning-skin');
    if (stripAnsiCodes && processedRaw !== rawJson) kinds.push('ansi-strip');
    if (matchedRule) kinds.push('rule-auto-classify');

    // Safety valve: if skin is bigger than raw, return raw
    if (skinText.length >= rawJson.length) {
        return {
            skin: rawJson,
            metrics: {
                applied: false,
                reason: 'skin-larger-than-raw',
                raw_chars: rawJson.length,
                skin_chars: skinText.length
            },
            compaction: createCompactionMetadata(false, 'raw-passthrough'),
            rule: matchedRule
        };
    }

    const rawTokens = estimateTokensFast(rawJson);
    const skinTokens = estimateTokensFast(skinText);
    const savings = 1 - (skinTokens / rawTokens);

    return {
        skin: skinText,
        metrics: {
            applied: true,
            raw_est_tokens: Math.ceil(rawTokens),
            skin_est_tokens: Math.ceil(skinTokens),
            savings_ratio: (savings * 100).toFixed(2) + '%',
            raw_chars: rawJson.length,
            skin_chars: skinText.length
        },
        compaction: createCompactionMetadata(true, ...kinds),
        rule: matchedRule
    };
};
