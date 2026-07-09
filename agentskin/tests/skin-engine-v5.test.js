import { describe, it, expect } from 'vitest';
import {
  recursive_prune,
  to_markdown_skin,
  analyze_compression,
  classify_url,
  createCompactionMetadata,
  mergeCompactionMetadata,
  skin
} from '../backend/lib/skin-engine.js';

describe('skin-engine v5 enhancements', () => {
  describe('classify_url', () => {
    it('classifies GitHub repos URL', () => {
      const result = classify_url('https://api.github.com/repos/vercel/next.js');
      expect(result).not.toBeNull();
      expect(result.rule.id).toBe('github/repos');
      expect(result.signals).toContain('stargazers_count');
      expect(result.aliases.stargazers_count).toBe('stars');
    });

    it('returns null for unknown URL', () => {
      expect(classify_url('https://unknown.example.com')).toBeNull();
    });
  });

  describe('createCompactionMetadata', () => {
    it('creates authoritative metadata', () => {
      const meta = createCompactionMetadata(true, 'signal-prune', 'alias-remap');
      expect(meta.authoritative).toBe(true);
      expect(meta.kinds).toContain('signal-prune');
      expect(meta.kinds).toContain('alias-remap');
    });

    it('creates non-authoritative metadata', () => {
      const meta = createCompactionMetadata(false, 'small-passthrough');
      expect(meta.authoritative).toBe(false);
    });

    it('deduplicates kinds', () => {
      const meta = createCompactionMetadata(true, 'signal-prune', 'signal-prune');
      expect(meta.kinds.length).toBe(1);
    });
  });

  describe('mergeCompactionMetadata', () => {
    it('merges multiple metadata records', () => {
      const a = createCompactionMetadata(true, 'signal-prune');
      const b = createCompactionMetadata(true, 'alias-remap');
      const merged = mergeCompactionMetadata(a, b);
      expect(merged.authoritative).toBe(true);
      expect(merged.kinds).toContain('signal-prune');
      expect(merged.kinds).toContain('alias-remap');
    });

    it('sets authoritative to false if any is false', () => {
      const a = createCompactionMetadata(true, 'signal-prune');
      const b = createCompactionMetadata(false, 'small-passthrough');
      const merged = mergeCompactionMetadata(a, b);
      expect(merged.authoritative).toBe(false);
    });

    it('handles undefined values', () => {
      const a = createCompactionMetadata(true, 'signal-prune');
      const merged = mergeCompactionMetadata(a, undefined);
      expect(merged.authoritative).toBe(true);
    });
  });

  describe('analyze_compression with compaction metadata', () => {
    it('includes compaction metadata in result', () => {
      const data = { name: 'test', description: 'A test object', extra: 'should be pruned' };
      const skinText = 'name: test\ndescription: A test object';
      const result = analyze_compression(data, skinText);
      expect(result.compaction).toBeDefined();
      expect(result.compaction.authoritative).toBe(true);
      expect(result.compaction.kinds).toContain('signal-prune');
    });

    it('returns non-authoritative for unpplied compression', () => {
      const data = { a: 1 };
      const skinText = JSON.stringify(data) + 'extra padding to make it longer than the original string representation';
      const result = analyze_compression(data, skinText);
      expect(result.applied).toBe(false);
      expect(result.compaction.authoritative).toBe(false);
    });
  });

  describe('skin pipeline', () => {
    it('auto-classifies GitHub URL and returns skin with metadata', () => {
      const data = {
        name: 'next.js',
        full_name: 'vercel/next.js',
        description: 'The React Framework',
        stargazers_count: 125000,
        language: 'JavaScript',
        forks_count: 26000,
        owner: { login: 'vercel', avatar_url: 'https://example.com/pic.png', node_id: 'abc' },
        node_id: 'repo123',
        created_at: '2016-10-05',
        private: false
      };
      const result = skin(data, { url: 'https://api.github.com/repos/vercel/next.js' });
      expect(result.skin).toContain('stars: 125000');
      expect(result.skin).toContain('next.js');
      expect(result.compaction.authoritative).toBe(true);
      expect(result.compaction.kinds).toContain('rule-auto-classify');
      expect(result.rule).not.toBeNull();
      expect(result.rule.id).toBe('github/repos');
      expect(result.metrics.applied).toBe(true);
    });

    it('smart passthrough for tiny payloads', () => {
      const data = { a: 1 };
      const result = skin(data, { url: '' });
      expect(result.compaction.kinds).toContain('small-passthrough');
      expect(result.metrics.applied).toBe(false);
    });

    it('uses manual signals when provided', () => {
      const data = { name: 'test', secret: 'hidden', value: 42 };
      const result = skin(data, { signals: ['name', 'value'], smallThreshold: 0 });
      expect(result.skin).toContain('name: test');
      expect(result.skin).toContain('value: 42');
      expect(result.skin).not.toContain('secret');
    });

    it('safety valve returns raw when skin is larger', () => {
      const data = { a: 1 };
      const result = skin(data, { signals: ['a'], smallThreshold: 100 });
      expect(result.metrics.applied).toBe(false);
      expect(result.compaction.kinds).toContain('small-passthrough');
    });
  });
});
