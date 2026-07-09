import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  graphemes,
  countTextChars,
  estimateTokens,
  estimateTokensFast,
  clampText,
  clampTextMiddle,
  isBelowSkinThreshold
} from '../backend/lib/text-utils.js';

describe('text-utils', () => {
  describe('stripAnsi', () => {
    it('strips CSI sequences', () => {
      const input = '\x1b[31mHello\x1b[0m World';
      expect(stripAnsi(input)).toBe('Hello World');
    });

    it('strips OSC sequences', () => {
      const input = '\x1b]0;title\x07text';
      expect(stripAnsi(input)).toBe('text');
    });

    it('strips incomplete CSI sequences', () => {
      const input = 'Hello\x1b[32';
      expect(stripAnsi(input)).toBe('Hello');
    });

    it('strips single-char escape codes', () => {
      const input = 'A\x1b@B';
      expect(stripAnsi(input)).toBe('AB');
    });

    it('handles plain text unchanged', () => {
      expect(stripAnsi('Hello World')).toBe('Hello World');
    });

    it('handles non-string input', () => {
      expect(stripAnsi(42)).toBe(42);
      expect(stripAnsi(null)).toBe(null);
    });
  });

  describe('graphemes and countTextChars', () => {
    it('counts ASCII characters correctly', () => {
      expect(countTextChars('hello')).toBe(5);
    });

    it('counts emoji as single graphemes', () => {
      expect(countTextChars('😀🎉')).toBe(2);
    });

    it('counts CJK characters correctly', () => {
      expect(countTextChars('你好世界')).toBe(4);
    });

    it('returns 0 for empty/null input', () => {
      expect(countTextChars('')).toBe(0);
      expect(countTextChars(null)).toBe(0);
    });

    it('graphemes returns an array', () => {
      const result = graphemes('abc');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });
  });

  describe('estimateTokens', () => {
    it('estimates tokens for simple text', () => {
      const tokens = estimateTokens('hello world test');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('returns 0 for empty input', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('is more conservative than fast estimate', () => {
      const text = 'A'.repeat(100);
      const graphemeEstimate = estimateTokens(text);
      const fastEstimate = estimateTokensFast(text);
      expect(graphemeEstimate).toBeGreaterThanOrEqual(fastEstimate);
    });
  });

  describe('estimateTokensFast', () => {
    it('uses length/4 heuristic', () => {
      expect(estimateTokensFast('abcd')).toBe(1);
      expect(estimateTokensFast('abcde')).toBe(2);
    });
  });

  describe('clampText', () => {
    it('returns text unchanged if under limit', () => {
      expect(clampText('short', 100)).toBe('short');
    });

    it('truncates long text with marker', () => {
      const text = 'A'.repeat(1000);
      const result = clampText(text, 50);
      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain('... truncated ...');
    });
  });

  describe('clampTextMiddle', () => {
    it('returns text unchanged if under limit', () => {
      expect(clampTextMiddle('short', 100)).toBe('short');
    });

    it('truncates middle of long text', () => {
      const lines = Array.from({length: 50}, (_, i) => `line ${i}`).join('\n');
      const result = clampTextMiddle(lines, 100);
      expect(result).toContain('... omitted ...');
      expect(result.length).toBeLessThan(lines.length);
    });
  });

  describe('isBelowSkinThreshold', () => {
    it('returns true for small text', () => {
      expect(isBelowSkinThreshold('tiny')).toBe(true);
    });

    it('returns false for large text', () => {
      expect(isBelowSkinThreshold('A'.repeat(500))).toBe(false);
    });

    it('returns true for null/empty', () => {
      expect(isBelowSkinThreshold(null)).toBe(true);
      expect(isBelowSkinThreshold('')).toBe(true);
    });

    it('respects custom threshold', () => {
      expect(isBelowSkinThreshold('A'.repeat(50), 100)).toBe(true);
      expect(isBelowSkinThreshold('A'.repeat(150), 100)).toBe(false);
    });
  });
});
