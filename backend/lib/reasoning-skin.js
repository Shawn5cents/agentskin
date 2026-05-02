/**
 * AgentSkin: Reasoning Skin (v1.0) - ADDED BY SPAWN
 * 
 * A lightweight text pruning module for LLM-to-LLM reasoning.
 * Inspired by AgentSkin's signal-detection concept, adapted for text.
 * 
 * @author Shawn Nichols Sr. // Nichols Transco LLC
 * @date 2026-03-12
 * 
 * Features:
 * - Strip hedge language (perhaps, might, could be)
 * - Remove filler words (actually, basically, I think)
 * - Collapse redundant phrases
 * - Optional JSON/structured output preservation
 * 
 * Usage:
 *   import { skinReasoning } from './lib/reasoning-skin.js';
 *   const { skin, metrics } = skinReasoning("I think perhaps...");
 */

const COMMISSION_RATE = 0.20;

// === PATTERN LIBRARIES ===

const HEDGE_PATTERNS = [
  /\bperhaps\b/gi, /\bmight\b/gi, /\bcould be\b/gi, /\bmaybe\b/gi,
  /\bpossibly\b/gi, /\bprobably\b/gi, /\bpotentially\b/gi,
  /\bit seems\b/gi, /\bit appears\b/gi, /\bseems like\b/gi,
  /\bI would say\b/gi, /\bone might\b/gi
];

const FILLER_PATTERNS = [
  /\bactually\b/gi, /\bbasically\b/gi, /\bI think\b/gi, /\byou know\b/gi,
  /\bI mean\b/gi, /\bsee\b/gi, /\blike\b/gi, /\breally\b/gi, 
  /\bvery\b/gi, /\bobviously\b/gi, /\bclearly\b/gi,
  /\bdefinitely\b/gi, /\bcertainly\b/gi, /\bof course\b/gi,
  /\bas you can see\b/gi, /\bas I mentioned\b/gi, /\bto be honest\b/gi,
  /\bin fact\b/gi, /\bhonestly\b/gi
];

const REDUNDANT_PHRASES = [
  { pattern: /\bvery\s+really\b/gi, replacement: 'very' },
  { pattern: /\breally\s+very\b/gi, replacement: 'really' },
  { pattern: /\bvery\s+clearly\b/gi, replacement: 'clearly' },
  { pattern: /\bbasically\s+what\s+I\s+mean\s+is\b/gi, replacement: 'meaning' },
  { pattern: /\bI\s+think\s+that\s+/gi, replacement: '' },
  { pattern: /\bthe\s+fact\s+that\b/gi, replacement: 'that' },
  { pattern: /\bin\s+order\s+to\b/gi, replacement: 'to' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, replacement: 'because' },
];

// === METRICS ===

function calculateSavings(original, skinned) {
  const charsRemoved = original.length - skinned.length;
  const estimatedTokenSavings = Math.floor(charsRemoved / 4);
  const platformFee = Math.floor(estimatedTokenSavings * COMMISSION_RATE);
  const percentReduced = Math.round((charsRemoved / original.length) * 100);
  
  return {
    charsRemoved,
    estimatedTokenSavings,
    percentReduced,
    platformFee,
    netBenefit: estimatedTokenSavings - platformFee
  };
}

// === CORE FUNCTIONS ===

export function skinReasoning(text) {
  let result = text;
  
  for (const pattern of HEDGE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  for (const { pattern, replacement } of REDUNDANT_PHRASES) {
    result = result.replace(pattern, replacement);
  }
  
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/\s+,/g, ',').replace(/\s+\./g, '.').replace(/\s+\?/g, '?');
  
  const metrics = calculateSavings(text, result);
  
  return { skin: result, metrics };
}

export function skinStructured(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const pruned = pruneObjectValues(parsed);
    const skin = JSON.stringify(pruned);
    const metrics = calculateSavings(jsonString, skin);
    return { skin, metrics };
  } catch {
    return skinReasoning(jsonString);
  }
}

function pruneObjectValues(obj) {
  if (typeof obj === 'string') {
    const { skin } = skinReasoning(obj);
    return skin;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(pruneObjectValues);
  }
  
  if (obj && typeof obj === 'object') {
    const pruned = {};
    for (const [key, value] of Object.entries(obj)) {
      pruned[key] = pruneObjectValues(value);
    }
    return pruned;
  }
  
  return obj;
}

export default { skinReasoning, skinStructured };
