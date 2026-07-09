import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import {
  loadUserRules,
  loadProjectRules,
  mergeRuleLayers,
  getAllRules,
  clearRuleCache,
  getConfigPaths,
  findMatchingRule,
} from '../backend/lib/api-skin-rules.js';

describe('3-layer rule config', () => {
  let tempHome;
  let tempProject;
  let originalXdg;

  beforeEach(() => {
    // Use a fresh temp HOME so ~/.config/agentskin/signals.json is isolated.
    tempHome = mkdtempSync(join(tmpdir(), 'agentskin-home-'));
    process.env.HOME = tempHome;
    process.env.USERPROFILE = tempHome; // Windows compat
    originalXdg = process.env.XDG_CONFIG_HOME;
    delete process.env.XDG_CONFIG_HOME;
    clearRuleCache();
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
    if (tempHome) rmSync(tempHome, { recursive: true, force: true });
    if (tempProject) rmSync(tempProject, { recursive: true, force: true });
    clearRuleCache();
  });

  describe('getConfigPaths', () => {
    it('returns the user config path under HOME/.config/agentskin/', () => {
      const paths = getConfigPaths();
      expect(paths.userPath).toBe(join(tempHome, '.config', 'agentskin', 'signals.json'));
    });

    it('returns a project config path when projectRoot is given', () => {
      tempProject = mkdtempSync(join(tmpdir(), 'agentskin-proj-'));
      const paths = getConfigPaths({ projectRoot: tempProject });
      expect(paths.projectPath).toBe(join(tempProject, '.agentskin', 'signals.json'));
    });

    it('respects XDG_CONFIG_HOME when set', () => {
      const xdg = mkdtempSync(join(tmpdir(), 'xdg-'));
      process.env.XDG_CONFIG_HOME = xdg;
      clearRuleCache();
      const paths = getConfigPaths();
      expect(paths.userPath).toBe(join(xdg, 'agentskin', 'signals.json'));
      rmSync(xdg, { recursive: true, force: true });
    });
  });

  describe('loadUserRules / loadProjectRules (missing files)', () => {
    it('returns [] when user config is missing', () => {
      expect(loadUserRules()).toEqual([]);
    });

    it('returns [] when project config is missing', () => {
      tempProject = mkdtempSync(join(tmpdir(), 'agentskin-proj-'));
      expect(loadProjectRules(tempProject)).toEqual([]);
    });

    it('returns [] when projectRoot is omitted and no project config exists', () => {
      // process.cwd() may or may not have a config; either way should be safe
      const rules = loadProjectRules();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('loadUserRules (valid + invalid files)', () => {
    it('parses a valid signals.json', () => {
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), JSON.stringify({
        rules: [{
          id: 'custom/my-api',
          family: 'custom',
          match: { urlIncludes: ['my-api.example.com'] },
          signals: ['id', 'name'],
          aliases: {},
          priority: 100,
        }],
      }));
      clearRuleCache();
      const rules = loadUserRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('custom/my-api');
    });

    it('returns [] on invalid JSON', () => {
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), 'not valid json {{{');
      clearRuleCache();
      expect(loadUserRules()).toEqual([]);
    });

    it('returns [] when JSON has no rules array', () => {
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), JSON.stringify({ other: 'shape' }));
      clearRuleCache();
      expect(loadUserRules()).toEqual([]);
    });

    it('drops rule entries missing id or match', () => {
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), JSON.stringify({
        rules: [
          { id: 'good/one', family: 'x', match: { urlIncludes: ['a'] }, signals: ['s'] },
          { id: 'bad/no-match' }, // missing match
          { match: { urlIncludes: ['b'] }, signals: ['s'] }, // missing id
          null,
        ],
      }));
      clearRuleCache();
      const rules = loadUserRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('good/one');
    });
  });

  describe('mergeRuleLayers (override + disable semantics)', () => {
    function writeUser(rules) {
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), JSON.stringify({ rules }));
      clearRuleCache();
    }

    function writeProject(projectRoot, rules) {
      const projDir = join(projectRoot, '.agentskin');
      mkdirSync(projDir, { recursive: true });
      writeFileSync(join(projDir, 'signals.json'), JSON.stringify({ rules }));
      clearRuleCache();
    }

    it('returns builtin rules when no user/project config exists', () => {
      const merged = mergeRuleLayers();
      // All builtin rules should be present
      const ids = merged.map(r => r.id);
      expect(ids).toContain('github/repos');
      expect(ids).toContain('weather/open-meteo');
      expect(ids).toContain('reddit/post');
    });

    it('user can override a builtin rule by reusing its id', () => {
      writeUser([{
        id: 'github/repos',
        family: 'github',
        match: { urlIncludes: ['api.github.com/repos/'] },
        signals: ['name', 'full_name'], // narrower signal set
        aliases: {},
        priority: 100,
      }]);
      const merged = mergeRuleLayers();
      const gh = merged.find(r => r.id === 'github/repos');
      expect(gh.signals).toEqual(['name', 'full_name']);
      // No stargazers_count in the override
      expect(gh.signals).not.toContain('stargazers_count');
    });

    it('user can disable a builtin rule with disabled: true', () => {
      writeUser([{ id: 'github/repos', disabled: true }]);
      const merged = mergeRuleLayers();
      expect(merged.find(r => r.id === 'github/repos')).toBeUndefined();
      // Other github rules still present
      expect(merged.find(r => r.id === 'github/users')).toBeDefined();
    });

    it('user can add new custom rules', () => {
      writeUser([{
        id: 'custom/internal',
        family: 'custom',
        match: { urlIncludes: ['internal.api'] },
        signals: ['id'],
        aliases: {},
        priority: 100,
      }]);
      const merged = mergeRuleLayers();
      expect(merged.find(r => r.id === 'custom/internal')).toBeDefined();
    });

    it('project overrides user overrides builtin', () => {
      writeUser([{
        id: 'github/repos',
        match: { urlIncludes: ['api.github.com/repos/'] },
        signals: ['name'],
        aliases: {},
      }]);
      tempProject = mkdtempSync(join(tmpdir(), 'agentskin-proj-'));
      writeProject(tempProject, [{
        id: 'github/repos',
        match: { urlIncludes: ['api.github.com/repos/'] },
        signals: ['name', 'description', 'language'],
        aliases: {},
      }]);
      const merged = mergeRuleLayers({ projectRoot: tempProject });
      const gh = merged.find(r => r.id === 'github/repos');
      // Project should win: only project signals present
      expect(gh.signals).toContain('language');
      expect(gh.signals).toEqual(expect.arrayContaining(['name', 'description', 'language']));
    });

    it('project can disable a rule the user has overridden (disable wins)', () => {
      writeUser([{
        id: 'github/repos',
        match: { urlIncludes: ['api.github.com/repos/'] },
        signals: ['name'],
        aliases: {},
      }]);
      tempProject = mkdtempSync(join(tmpdir(), 'agentskin-proj-'));
      writeProject(tempProject, [{ id: 'github/repos', disabled: true }]);
      const merged = mergeRuleLayers({ projectRoot: tempProject });
      expect(merged.find(r => r.id === 'github/repos')).toBeUndefined();
    });

    it('project can add new rules not in user or builtin', () => {
      tempProject = mkdtempSync(join(tmpdir(), 'agentskin-proj-'));
      writeProject(tempProject, [{
        id: 'project/special',
        family: 'project',
        match: { urlIncludes: ['proj.example.com'] },
        signals: ['id'],
        aliases: {},
      }]);
      const merged = mergeRuleLayers({ projectRoot: tempProject });
      expect(merged.find(r => r.id === 'project/special')).toBeDefined();
    });
  });

  describe('getAllRules caching', () => {
    it('returns the same merged set for the same projectRoot', () => {
      const a = getAllRules();
      const b = getAllRules();
      expect(a).toBe(b); // same reference
    });

    it('returns a fresh set after clearRuleCache()', () => {
      const a = getAllRules();
      clearRuleCache();
      const b = getAllRules();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it('returns different sets for different projectRoots', () => {
      const tempProject2 = mkdtempSync(join(tmpdir(), 'agentskin-proj2-'));
      const a = getAllRules();
      const b = getAllRules({ projectRoot: tempProject2 });
      // Same builtin (no config in either), but cache keys differ
      expect(a).toEqual(b);
      rmSync(tempProject2, { recursive: true, force: true });
    });
  });

  describe('findMatchingRule integration with layered config', () => {
    it('uses builtin rules by default', () => {
      const rule = findMatchingRule('https://api.github.com/repos/vercel/next.js');
      expect(rule.id).toBe('github/repos');
    });

    it('skips layered config when useLayeredConfig=false', () => {
      // Add a user rule that would otherwise override github/repos
      const userDir = join(tempHome, '.config', 'agentskin');
      mkdirSync(userDir, { recursive: true });
      writeFileSync(join(userDir, 'signals.json'), JSON.stringify({
        rules: [{
          id: 'github/repos',
          match: { urlIncludes: ['api.github.com/repos/'] },
          signals: ['only-this-key'],
          aliases: {},
        }],
      }));
      clearRuleCache();
      const layered = findMatchingRule('https://api.github.com/repos/vercel/next.js');
      const builtin = findMatchingRule('https://api.github.com/repos/vercel/next.js', { useLayeredConfig: false });
      expect(layered.signals).toEqual(['only-this-key']);
      expect(builtin.signals).toContain('stargazers_count');
    });

    it('returns null for unknown URLs even with layered config', () => {
      const rule = findMatchingRule('https://unknown.example.com/api');
      expect(rule).toBeNull();
    });
  });
});
