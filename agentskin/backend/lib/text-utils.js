/**
 * AgentSkin: Text Utilities v1.0
 * Ports Tokenjuice's text handling patterns into AgentSkin.
 * Provides grapheme-aware counting, ANSI stripping, and improved token estimation.
 */

// --- ANSI Stripping ---

const ANSI_CSI_PATTERN = /\x1b\[[\d;]*[\x20-\x7e]/gu;
const ANSI_OSC_PATTERN = /\x1b\].*?(?:\x07|\x1b\\)/gu;
const ANSI_CSI_INCOMPLETE_PATTERN = /\x1b\[[\d;]*$/gu;
const ANSI_OSC_INCOMPLETE_PATTERN = /\x1b\].*$/gu;
const ANSI_SINGLE_PATTERN = /\x1b[\x40-\x5F]/gu;

/**
 * Strip ANSI escape codes from text.
 * Handles CSI, OSC, incomplete, and single-char escapes.
 */
export function stripAnsi(text) {
  if (typeof text !== 'string') return text;
  return text
    .replaceAll(ANSI_OSC_PATTERN, '')
    .replaceAll(ANSI_CSI_PATTERN, '')
    .replaceAll(ANSI_OSC_INCOMPLETE_PATTERN, '')
    .replaceAll(ANSI_CSI_INCOMPLETE_PATTERN, '')
    .replaceAll(ANSI_SINGLE_PATTERN, '')
    .replaceAll(//g, '');
}

// --- Grapheme-Aware Counting ---

let graphemeSegmenter = null;
try {
  graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
} catch {
  graphemeSegmenter = null;
}

/**
 * Split text into grapheme clusters.
 */
export function graphemes(text) {
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), s => s.segment);
  }
  return Array.from(text);
}

/**
 * Count text characters using grapheme clusters.
 * Handles CJK, emoji, combining marks correctly.
 */
export function countTextChars(text) {
  if (!text) return 0;
  return graphemes(text).length;
}

// --- Token Estimation ---

/**
 * Estimate token count from text length.
 * Uses grapheme-aware counting for accuracy.
 * Approximates ~3.5 chars per token (conservative for mixed content).
 */
export function estimateTokens(text) {
  if (!text) return 0;
  const chars = countTextChars(text);
  return Math.ceil(chars / 3.5);
}

/**
 * Estimate token count using the simpler length/4 heuristic.
 * Matches AgentSkin's existing estimation for backward compatibility.
 */
export function estimateTokensFast(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// --- Truncation ---

const TRUNCATION_SUFFIX = '\n... truncated ...';
const MIDDLE_TRUNCATION_MARKER = '\n... omitted ...\n';

/**
 * Trim head text to the last line boundary.
 */
function trimHeadToLineBoundary(text) {
  const lastNewline = text.lastIndexOf('\n');
  if (lastNewline > text.length * 0.5) {
    return text.slice(0, lastNewline);
  }
  return text;
}

/**
 * Trim tail text to the first line boundary.
 */
function trimTailToLineBoundary(text) {
  const firstNewline = text.indexOf('\n');
  if (firstNewline >= 0 && firstNewline < text.length * 0.5) {
    return text.slice(firstNewline + 1);
  }
  return text;
}

/**
 * Clamp text to maxChars with tail truncation.
 */
export function clampText(text, maxChars) {
  const chars = countTextChars(text);
  if (chars <= maxChars) return text;
  const bodyChars = maxChars - countTextChars(TRUNCATION_SUFFIX);
  const head = graphemes(text).slice(0, bodyChars).join('');
  return trimHeadToLineBoundary(head) + TRUNCATION_SUFFIX;
}

/**
 * Clamp text to maxChars keeping head and tail (middle omitted).
 */
export function clampTextMiddle(text, maxChars) {
  const chars = countTextChars(text);
  if (chars <= maxChars) return text;
  const markerLen = countTextChars(MIDDLE_TRUNCATION_MARKER);
  const bodyChars = maxChars - markerLen;
  const headChars = Math.ceil(bodyChars * 0.7);
  const tailChars = bodyChars - headChars;
  const allGraphemes = graphemes(text);
  const head = allGraphemes.slice(0, headChars).join('');
  const tail = allGraphemes.slice(-tailChars).join('');
  return trimHeadToLineBoundary(head) + MIDDLE_TRUNCATION_MARKER + trimTailToLineBoundary(tail);
}

// --- Small Output Detection ---

/**
 * Determine if output is too small to benefit from skinning.
 * Returns true if the data is small enough to pass through raw.
 */
export function isBelowSkinThreshold(rawText, maxChars = 300) {
  if (!rawText) return true;
  return countTextChars(rawText) <= maxChars;
}
