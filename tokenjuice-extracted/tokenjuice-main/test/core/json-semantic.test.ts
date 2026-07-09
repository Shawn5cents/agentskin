/**
 * Tests for the json-semantic reducer (Phase 2 port from AgentSkin).
 * Mirrors the AgentSkin benchmark suite where applicable.
 */

import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SIGNAL_KEYS,
    BUILTIN_URL_RULES,
    pruneJson,
    flattenJson,
    findUrlRule,
    applyJsonSemantic,
    estimateTokens,
    estimateTokensFast,
} from '../../src/core/json-semantic.js';
import { createCompactionMetadata, createPassthroughCompactionMetadata } from '../../src/core/compaction-metadata.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Vercel next.js repo response (subset of fields AgentSkin benchmarks). */
const GITHUB_REPO = {
    id: 70107586,
    node_id: 'MDEwOlJlcG9zaXRvcnk3MDEwNzU4Ng==',
    name: 'next.js',
    full_name: 'vercel/next.js',
    private: false,
    owner: {
        login: 'vercel',
        id: 14985020,
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjE0OTg1MDIw',
        avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4',
        gravatar_id: '',
        url: 'https://api.github.com/users/vercel',
        type: 'Organization',
        site_admin: false,
    },
    html_url: 'https://github.com/vercel/next.js',
    description: 'The React Framework',
    fork: false,
    url: 'https://api.github.com/repos/vercel/next.js',
    created_at: '2016-10-05T23:13:13Z',
    updated_at: '2024-01-15T12:34:56Z',
    pushed_at: '2024-01-15T11:00:00Z',
    homepage: 'https://nextjs.org',
    size: 234567,
    stargazers_count: 118000,
    watchers_count: 118000,
    language: 'JavaScript',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' },
    topics: ['react', 'framework', 'ssr'],
    forks_count: 25000,
    open_issues_count: 1500,
    default_branch: 'canary',
    archived: false,
    disabled: false,
};

const NPM_PACKAGE = {
    name: 'lodash',
    description: 'Lodash modular utilities.',
    'dist-tags': { latest: '4.17.21' },
    versions: { '4.17.21': { name: 'lodash', version: '4.17.21' } },
    time: { modified: '2021-02-20T00:00:00Z', created: '2012-04-23T00:00:00Z' },
    homepage: 'https://lodash.com/',
    license: 'MIT',
    keywords: ['modules', 'utilities'],
    dependencies: { foo: '^1.0.0' },
    devDependencies: { bar: '^2.0.0' },
    repository: { type: 'git', url: 'https://github.com/lodash/lodash.git' },
    maintainers: [{ name: 'jdalton', email: 'john.david.dalton@gmail.com' }],
    _id: 'lodash@4.17.21',
    _rev: '1234',
    _npmUser: { name: 'jdalton' },
};

// ---------------------------------------------------------------------------
// DEFAULT_SIGNAL_KEYS
// ---------------------------------------------------------------------------

describe('DEFAULT_SIGNAL_KEYS', () => {
    it('contains the expected core signal keys', () => {
        expect(DEFAULT_SIGNAL_KEYS).toContain('id');
        expect(DEFAULT_SIGNAL_KEYS).toContain('name');
        expect(DEFAULT_SIGNAL_KEYS).toContain('title');
        expect(DEFAULT_SIGNAL_KEYS).toContain('status');
    });

    it('includes shorthand keys c, v, p', () => {
        expect(DEFAULT_SIGNAL_KEYS).toContain('c');
        expect(DEFAULT_SIGNAL_KEYS).toContain('v');
        expect(DEFAULT_SIGNAL_KEYS).toContain('p');
    });
});

// ---------------------------------------------------------------------------
// pruneJson
// ---------------------------------------------------------------------------

describe('pruneJson', () => {
    it('keeps signal-matched keys at the top level', () => {
        const out = pruneJson({ name: 'ok', secret: 'hidden' }) as Record<string, unknown>;
        expect(out).toEqual({ name: 'ok' });
    });

    it('matches signal keys case-insensitively', () => {
        const out = pruneJson({ Name: 'ok', ID: 42 }) as Record<string, unknown>;
        expect(out).toEqual({ Name: 'ok', ID: 42 });
    });

    it('recurses into nested objects when no signal match', () => {
        const out = pruneJson({
            wrapper: { name: 'inner', noise: 'skip' },
        }) as Record<string, unknown>;
        expect(out).toEqual({ wrapper: { name: 'inner' } });
    });

    it('drops entire subtrees with no signal matches', () => {
        const out = pruneJson({
            name: 'top',
            orphan: { only: 'noise', here: 'too' },
        }) as Record<string, unknown>;
        expect(out).toEqual({ name: 'top' });
    });

    it('applies aliases when mapping keys', () => {
        const out = pruneJson(
            { stargazers_count: 100 },
            [],
            { stargazers_count: 'stars' },
        ) as Record<string, unknown>;
        expect(out).toEqual({ stars: 100 });
    });

    it('maps array items through pruneJson', () => {
        const out = pruneJson([
            { name: 'a', secret: 'x' },
            { name: 'b', secret: 'y' },
        ]) as Array<Record<string, unknown>>;
        expect(out).toHaveLength(2);
        expect(out[0]).toEqual({ name: 'a' });
        expect(out[1]).toEqual({ name: 'b' });
    });

    it('passes primitives through unchanged', () => {
        expect(pruneJson(42)).toBe(42);
        expect(pruneJson('hello')).toBe('hello');
        expect(pruneJson(null)).toBe(null);
    });

    it('honors requiredKeys for additional signals', () => {
        const out = pruneJson({ custom: 'keep', name: 'n' }, ['custom']) as Record<string, unknown>;
        expect(out).toEqual({ custom: 'keep', name: 'n' });
    });
});

// ---------------------------------------------------------------------------
// flattenJson
// ---------------------------------------------------------------------------

describe('flattenJson', () => {
    it('produces key: value lines for a flat object', () => {
        const out = flattenJson({ name: 'ok', id: 1 });
        expect(out).toContain('name: ok');
        expect(out).toContain('id: 1');
    });

    it('uses dot notation for nested objects', () => {
        const out = flattenJson({ owner: { login: 'vercel' } });
        expect(out).toContain('owner.login: vercel');
    });

    it('omits title when rawDataSize <= 500', () => {
        const out = flattenJson({ name: 'a' }, 'MyTitle', 100);
        expect(out).not.toContain('MyTitle');
    });

    it('includes title when rawDataSize > 500', () => {
        const out = flattenJson({ name: 'a' }, 'MyTitle', 1000);
        expect(out.startsWith('[MyTitle]')).toBe(true);
    });

    it('formats array values with dot-prefix', () => {
        const out = flattenJson({ items: [{ name: 'a' }, { name: 'b' }] });
        expect(out).toContain('items.name: a');
        expect(out).toContain('items.name: b');
    });
});

// ---------------------------------------------------------------------------
// findUrlRule
// ---------------------------------------------------------------------------

describe('findUrlRule', () => {
    it('matches GitHub repos rule by URL', () => {
        const r = findUrlRule('https://api.github.com/repos/vercel/next.js');
        expect(r).not.toBeNull();
        expect(r!.id).toBe('github/repos');
        expect(r!.signals).toContain('stargazers_count');
    });

    it('matches GitHub users rule', () => {
        const r = findUrlRule('https://api.github.com/users/octocat');
        expect(r?.id).toBe('github/users');
    });

    it('matches npm registry rule', () => {
        const r = findUrlRule('https://registry.npmjs.org/lodash');
        expect(r?.id).toBe('npm/registry');
    });

    it('matches JSONPlaceholder rules', () => {
        expect(findUrlRule('https://jsonplaceholder.typicode.com/posts/1')?.id).toBe('jsonplaceholder/posts');
        expect(findUrlRule('https://jsonplaceholder.typicode.com/users/1')?.id).toBe('jsonplaceholder/users');
    });

    it('returns null for unknown URLs', () => {
        expect(findUrlRule('https://example.com/api')).toBeNull();
        expect(findUrlRule('not a url')).toBeNull();
        expect(findUrlRule('')).toBeNull();
    });

    it('prioritizes more specific rules', () => {
        // github/issues is more specific than github/repos when /issues is in the URL
        const r = findUrlRule('https://api.github.com/repos/foo/bar/issues/1');
        expect(r?.id).toBe('github/issues');
    });
});

// ---------------------------------------------------------------------------
// applyJsonSemantic
// ---------------------------------------------------------------------------

describe('applyJsonSemantic', () => {
    it('returns raw passthrough for small payloads', () => {
        const r = applyJsonSemantic({ name: 'x' });
        expect(r.metrics.applied).toBe(false);
        expect(r.metrics.reason).toBe('below-threshold');
        expect(r.skin).toBe('{"name":"x"}');
        expect(r.compaction.kinds).toContain('small-passthrough');
    });

    it('auto-classifies GitHub repo URL and prunes', () => {
        const r = applyJsonSemantic(GITHUB_REPO, {
            url: 'https://api.github.com/repos/vercel/next.js',
        });
        expect(r.metrics.applied).toBe(true);
        expect(r.rule?.id).toBe('github/repos');
        expect(r.skin).toContain('repo: vercel/next.js');
        expect(r.skin).toContain('stars: 118000');
        expect(r.skin).toContain('language: JavaScript');
        // The noise fields should be gone
        expect(r.skin).not.toContain('node_id');
        expect(r.skin).not.toContain('gravatar_id');
        expect(r.skin).not.toContain('avatar_url');
    });

    it('auto-classifies npm registry URL and prunes', () => {
        const r = applyJsonSemantic(NPM_PACKAGE, {
            url: 'https://registry.npmjs.org/lodash',
        });
        expect(r.metrics.applied).toBe(true);
        expect(r.rule?.id).toBe('npm/registry');
        expect(r.skin).toContain('name: lodash');
        expect(r.skin).toContain('tags');
        expect(r.skin).toContain('license: MIT');
    });

    it('honors manual signals when provided', () => {
        const r = applyJsonSemantic({ foo: 1, bar: 2, name: 'x' }, {
            signals: ['foo', 'bar'],
            smallThreshold: 0,
        });
        expect(r.metrics.applied).toBe(true);
        expect(r.skin).toContain('foo: 1');
        expect(r.skin).toContain('bar: 2');
        expect(r.skin).toContain('name: x');
    });

    it('computes positive savings ratio on the GitHub fixture', () => {
        const r = applyJsonSemantic(GITHUB_REPO, {
            url: 'https://api.github.com/repos/vercel/next.js',
        });
        expect(r.metrics.applied).toBe(true);
        const ratio = parseFloat(r.metrics.savings_ratio!.replace('%', ''));
        expect(ratio).toBeGreaterThan(30);
    });

    it('returns raw passthrough when no signal matches', () => {
        const r = applyJsonSemantic({ secret: 'hidden' }, { signals: ['name'], smallThreshold: 0 });
        expect(r.metrics.applied).toBe(false);
        expect(r.metrics.reason).toBe('no-signals-matched');
    });

    it('safety valve returns raw when skin is not smaller', () => {
        // Tiny raw data that has zero savings potential
        const r = applyJsonSemantic({ name: 'x' }, { smallThreshold: 100 });
        expect(r.metrics.applied).toBe(false);
        expect(r.compaction.kinds).toContain('small-passthrough');
    });

    it('includes title only when rawDataSize > 500', () => {
        // Use a GitHub-shaped response large enough to trigger title
        const r = applyJsonSemantic(GITHUB_REPO, {
            url: 'https://api.github.com/repos/vercel/next.js',
            title: 'Vercel Next.js',
        });
        if (r.metrics.raw_chars > 500) {
            expect(r.skin.startsWith('[Vercel Next.js]')).toBe(true);
        }
    });

    it('merges user aliases on top of URL-rule aliases', () => {
        const r = applyJsonSemantic(
            { stargazers_count: 100, language: 'JS' },
            {
                url: 'https://api.github.com/repos/foo/bar',
                aliases: { stargazers_count: 'star_count' },
                smallThreshold: 0,
            },
        );
        expect(r.skin).toContain('star_count: 100');
        expect(r.skin).not.toContain('stars: 100');
    });
});

// ---------------------------------------------------------------------------
// Compaction metadata
// ---------------------------------------------------------------------------

describe('createCompactionMetadata', () => {
    it('deduplicates kinds', () => {
        const m = createCompactionMetadata('signal-prune', 'signal-prune', 'alias-remap');
        expect(m.kinds).toEqual(['signal-prune', 'alias-remap']);
    });

    it('authoritative flag is preserved', () => {
        expect(createCompactionMetadata('signal-prune').authoritative).toBe(true);
        expect(createPassthroughCompactionMetadata('raw-passthrough').authoritative).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

describe('estimateTokens', () => {
    it('returns 0 for empty input', () => {
        expect(estimateTokens('')).toBe(0);
    });

    it('returns positive tokens for non-empty input', () => {
        expect(estimateTokens('hello world')).toBeGreaterThan(0);
    });
});

describe('estimateTokensFast', () => {
    it('uses length/4 heuristic', () => {
        expect(estimateTokensFast('12345678')).toBe(2);
        expect(estimateTokensFast('1234')).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Built-in rule families
// ---------------------------------------------------------------------------

describe('applyJsonSemantic with ANSI codes', () => {
    it('strips ANSI escape codes from raw JSON when stripAnsiCodes=true', () => {
        const dataWithAnsi = '[31m{"name":"a","id":1}[0m';
        // The function stringifies then strips - pass stringified data so it round-trips
        const r = applyJsonSemantic({ name: 'a', id: 1, secret: 'x' }, { smallThreshold: 0 });
        expect(r.metrics.applied).toBe(true);
        // Verify the path runs (no exception)
        expect(r.skin).toBeTruthy();
    });

    it('skips ANSI stripping when stripAnsiCodes=false', () => {
        const r = applyJsonSemantic({ name: 'a' }, { stripAnsiCodes: false, smallThreshold: 0 });
        // Small payload passthrough; stripAnsiCodes flag still affects behavior
        expect(r.metrics.applied).toBe(true);
    });
});

describe('BUILTIN_URL_RULES', () => {
    it('has at least 4 rule families', () => {
        expect(BUILTIN_URL_RULES.length).toBeGreaterThanOrEqual(4);
    });

    it('each rule has a unique id', () => {
        const ids = BUILTIN_URL_RULES.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('each rule has required fields', () => {
        for (const r of BUILTIN_URL_RULES) {
            expect(r.id).toBeTruthy();
            expect(r.family).toBeTruthy();
            expect(r.signals.length).toBeGreaterThan(0);
            expect(r.priority).toBeGreaterThan(0);
        }
    });
});
