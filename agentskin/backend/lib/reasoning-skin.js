/**
 * AgentSkin: Reasoning Skin (v2.0.0)
 * Lightweight text pruning module for LLM-to-LLM reasoning.
 * Enhanced with grapheme-aware metrics from Tokenjuice patterns.
 */

import { countTextChars, estimateTokens, estimateTokensFast } from './text-utils.js';

// --- Constants ---

const COMMISSION_RATE = 0.20;

// --- Pattern Libraries ---

// Hedge patterns: uncertain, non-committal language
const HEDGE_PATTERNS = [
    /\bperhaps\b/gi,
    /\bmight\b/gi,
    /\bcould be\b/gi,
    /\bmaybe\b/gi,
    /\bpossibly\b/gi,
    /\bprobably\b/gi,
    /\bpotentially\b/gi,
    /\bit seems\b/gi,
    /\bit appears\b/gi,
    /\bseems like\b/gi,
    /\bI would say\b/gi,
    /\bone might\b/gi
];

// Filler patterns: low-signal words and phrases
const FILLER_PATTERNS = [
    /\bactually\b/gi,
    /\bbasically\b/gi,
    /\bI think\b/gi,
    /\byou know\b/gi,
    /\bI mean\b/gi,
    /\bso\b/gi,
    /\blike\b/gi,
    /\breally\b/gi,
    /\bvery\b/gi,
    /\bobviously\b/gi,
    /\bclearly\b/gi,
    /\bdefinitely\b/gi,
    /\bcertainly\b/gi,
    /\bof course\b/gi,
    /\bas you can see\b/gi,
    /\bas I mentioned\b/gi,
    /\bto be honest\b/gi,
    /\bin fact\b/gi,
    /\bhonestly\b/gi
];

// Redundant phrase replacements
const REDUNDANT_PHRASES = [
    { pattern: /\bvery really\b/gi, replacement: 'very' },
    { pattern: /\breally very\b/gi, replacement: 'really' },
    { pattern: /\bvery clearly\b/gi, replacement: 'clearly' },
    { pattern: /\bbasically what I mean is\b/gi, replacement: 'meaning' },
    { pattern: /\bI think that /gi, replacement: '' },
    { pattern: /\bthe fact that\b/gi, replacement: 'that' },
    { pattern: /\bin order to\b/gi, replacement: 'to' },
    { pattern: /\bdue to the fact that\b/gi, replacement: 'because' }
];

// --- Metrics ---

/**
 * Calculate savings metrics between original and skinned text.
 * Uses both simple (length/4) and grapheme-aware estimation.
 */
function calculateSavings(original, skinned) {
    const charsRemoved = original.length - skinned.length;
    const estimatedTokenSavings = Math.floor(charsRemoved / 4);
    const graphemeTokenSavings = estimateTokens(original) - estimateTokens(skinned);
    const platformFee = Math.floor(estimatedTokenSavings * COMMISSION_RATE);
    const percentReduced = Math.round((charsRemoved / original.length) * 100);
    const netBenefit = estimatedTokenSavings - platformFee;

    return {
        charsRemoved,
        estimatedTokenSavings,
        graphemeTokenSavings: Math.max(0, graphemeTokenSavings),
        platformFee,
        percentReduced,
        netBenefit
    };
}

// --- Core Functions ---

/**
 * Skin natural language text by removing hedge words, fillers, and redundant phrases.
 * @param {string} text - Input text
 * @returns {{ skin: string, metrics: Object }}
 */
export function skinReasoning(text) {
    let result = text;

    // Strip hedge patterns
    for (const pattern of HEDGE_PATTERNS) {
        result = result.replace(pattern, '');
    }

    // Strip filler patterns
    for (const pattern of FILLER_PATTERNS) {
        result = result.replace(pattern, '');
    }

    // Apply redundant phrase replacements
    for (const { pattern, replacement } of REDUNDANT_PHRASES) {
        result = result.replace(pattern, replacement);
    }

    // Normalize whitespace
    result = result.replace(/\s+/g, ' ').trim();

    // Clean up punctuation spacing
    result = result.replace(/\s+([,.?!])/g, '$1');

    const metrics = calculateSavings(text, result);
    return { skin: result, metrics };
}

/**
 * Skin all string values within a JSON object.
 * @param {string} jsonString - JSON string input
 * @returns {{ skin: string, metrics: Object }}
 */
export function skinStructured(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        const pruned = pruneObjectValues(parsed);
        const skinned = JSON.stringify(pruned);
        const metrics = calculateSavings(jsonString, skinned);
        return { skin: skinned, metrics };
    } catch {
        return skinReasoning(jsonString);
    }
}

/**
 * Recursively prune string values within an object/array tree.
 */
function pruneObjectValues(obj) {
    if (typeof obj === 'string') {
        const { skin } = skinReasoning(obj);
        return skin;
    }
    if (Array.isArray(obj)) {
        return obj.map(pruneObjectValues);
    }
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = pruneObjectValues(value);
        }
        return result;
    }
    return obj;
}

// Default export
export default { skinReasoning, skinStructured };
