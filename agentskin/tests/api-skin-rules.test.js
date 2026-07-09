import { describe, it, expect } from 'vitest';
import {
  findMatchingRule,
  getBuiltinRules,
  getRulesByFamily,
  getFamilies
} from '../backend/lib/api-skin-rules.js';

describe('api-skin-rules', () => {
  describe('findMatchingRule', () => {
    it('matches GitHub repos API', () => {
      const rule = findMatchingRule('https://api.github.com/repos/vercel/next.js');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('github/repos');
      expect(rule.family).toBe('github');
      expect(rule.signals).toContain('stargazers_count');
      expect(rule.aliases.stargazers_count).toBe('stars');
    });

    it('matches GitHub users API', () => {
      const rule = findMatchingRule('https://api.github.com/users/octocat');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('github/users');
    });

    it('matches GitHub issues API', () => {
      const rule = findMatchingRule('https://api.github.com/repos/foo/bar/issues/42');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('github/issues');
    });

    it('matches GitHub search API', () => {
      const rule = findMatchingRule('https://api.github.com/search/repositories?q=test');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('github/search');
    });

    it('matches GitHub pulls API', () => {
      const rule = findMatchingRule('https://api.github.com/repos/foo/bar/pulls/7');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('github/pulls');
    });

    it('matches Open-Meteo weather API', () => {
      const rule = findMatchingRule('https://api.open-meteo.com/v1/forecast?latitude=52');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('weather/open-meteo');
      expect(rule.aliases.temperature_2m).toBe('temp');
    });

    it('matches HackerNews API', () => {
      const rule = findMatchingRule('https://hacker-news.firebaseio.com/v0/item/123.json');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('hackernews/item');
    });

    it('matches JSONPlaceholder posts', () => {
      const rule = findMatchingRule('https://jsonplaceholder.typicode.com/posts/1');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('jsonplaceholder/posts');
    });

    it('matches npm registry', () => {
      const rule = findMatchingRule('https://registry.npmjs.org/express');
      expect(rule).not.toBeNull();
      expect(rule.id).toBe('npm/registry');
    });

    it('returns null for unknown URLs', () => {
      const rule = findMatchingRule('https://example.com/api/data');
      expect(rule).toBeNull();
    });

    it('prefers more specific rules', () => {
      const rule = findMatchingRule('https://api.github.com/repos/foo/bar/issues');
      expect(rule.id).toBe('github/issues');
    });
  });

  describe('getBuiltinRules', () => {
    it('returns an array of rules', () => {
      const rules = getBuiltinRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('all rules have required fields', () => {
      const rules = getBuiltinRules();
      for (const rule of rules) {
        expect(rule.id).toBeTruthy();
        expect(rule.family).toBeTruthy();
        expect(rule.signals).toBeDefined();
        expect(Array.isArray(rule.signals)).toBe(true);
        expect(rule.signals.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getRulesByFamily', () => {
    it('returns rules for github family', () => {
      const rules = getRulesByFamily('github');
      expect(rules.length).toBe(5);
    });

    it('returns empty array for unknown family', () => {
      const rules = getRulesByFamily('nonexistent');
      expect(rules.length).toBe(0);
    });
  });

  describe('getFamilies', () => {
    it('returns all unique families', () => {
      const families = getFamilies();
      expect(families).toContain('github');
      expect(families).toContain('weather');
      expect(families).toContain('hackernews');
      expect(new Set(families).size).toBe(families.length);
    });
  });
});
