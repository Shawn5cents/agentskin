/**
 * Tests for agentskin/signals.schema.json
 *
 * Validates the schema against:
 *   1. BUILTIN_RULES from api-skin-rules.js (must validate as-is)
 *   2. A representative project-layer override file (replace + disable + new)
 *   3. A representative user-layer override file (reduce signals)
 *   4. A pure disable directive
 *   5. Malformed entries (rejected with specific errors)
 *
 * Uses a small in-house JSON Schema validator that covers the subset of
 * draft-07 used by signals.schema.json. No new dependencies.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBuiltinRules } from '../backend/lib/api-skin-rules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '..', 'signals.schema.json');

// ---------------------------------------------------------------------------
// In-house JSON Schema validator (subset of draft-07).
// Supports: $ref, type, const, enum, pattern, minLength, minimum, maximum,
// uniqueItems, required, properties, additionalProperties, items, anyOf,
// allOf, oneOf, if/then/else.
// ---------------------------------------------------------------------------

function _validate(data, schema, path, errors, root) {
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/')) {
      errors.push({ path, message: `unsupported $ref: ${schema.$ref}` });
      return;
    }
    const parts = schema.$ref.slice(2).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let resolved = root;
    for (const part of parts) {
      if (resolved === undefined || resolved === null || !(part in resolved)) {
        errors.push({ path, message: `unresolved $ref: ${schema.$ref}` });
        return;
      }
      resolved = resolved[part];
    }
    return _validate(data, resolved, path, errors, root);
  }

  if (schema.type !== undefined) {
    const actual = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
    if (schema.type !== actual) {
      errors.push({ path, message: `expected type "${schema.type}" at ${path || '<root>'}, got "${actual}"` });
      return;
    }
  }

  if (schema.const !== undefined && data !== schema.const) {
    errors.push({ path, message: `expected const ${JSON.stringify(schema.const)} at ${path}, got ${JSON.stringify(data)}` });
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push({ path, message: `expected one of ${JSON.stringify(schema.enum)} at ${path}, got ${JSON.stringify(data)}` });
  }

  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path, message: `string shorter than minLength ${schema.minLength} at ${path}` });
    }
    if (schema.pattern !== undefined) {
      const re = new RegExp(schema.pattern);
      if (!re.test(data)) {
        errors.push({ path, message: `string "${data}" does not match pattern /${schema.pattern}/ at ${path}` });
      }
    }
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path, message: `number ${data} below minimum ${schema.minimum} at ${path}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path, message: `number ${data} above maximum ${schema.maximum} at ${path}` });
    }
  }

  if (Array.isArray(data)) {
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (let i = 0; i < data.length; i++) {
        const k = JSON.stringify(data[i]);
        if (seen.has(k)) errors.push({ path: `${path}[${i}]`, message: `duplicate item: ${k}` });
        seen.add(k);
      }
    }
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path, message: `array has ${data.length} items, minItems is ${schema.minItems}` });
    }
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        _validate(data[i], schema.items, `${path}[${i}]`, errors, root);
      }
    }
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in data)) {
          errors.push({ path: `${path}.${key}`, message: `missing required property "${key}" at ${path || '<root>'}` });
        }
      }
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in data) _validate(data[key], sub, `${path}.${key}`, errors, root);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) errors.push({ path: `${path}.${key}`, message: `unknown property "${key}" (additionalProperties=false) at ${path || '<root>'}` });
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) _validate(data[key], schema.additionalProperties, `${path}.${key}`, errors, root);
      }
    }
  }

  if (Array.isArray(schema.anyOf)) {
    let matched = false;
    for (const sub of schema.anyOf) {
      const subErrs = [];
      _validate(data, sub, path, subErrs, root);
      if (subErrs.length === 0) { matched = true; break; }
    }
    if (!matched) errors.push({ path, message: `value at ${path || '<root>'} does not match any anyOf branch` });
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) _validate(data, sub, path, errors, root);
  }

  if (Array.isArray(schema.oneOf)) {
    let matched = 0;
    for (const sub of schema.oneOf) {
      const subErrs = [];
      _validate(data, sub, path, subErrs, root);
      if (subErrs.length === 0) matched++;
    }
    if (matched !== 1) errors.push({ path, message: `value at ${path || '<root>'} matches ${matched} oneOf branches (expected exactly 1)` });
  }

  if (schema.if) {
    const ifErrs = [];
    _validate(data, schema.if, path, ifErrs, root);
    if (ifErrs.length === 0 && schema.then) {
      _validate(data, schema.then, path, errors, root);
    } else if (ifErrs.length > 0 && schema.else) {
      _validate(data, schema.else, path, errors, root);
    }
  }

  if (schema.not) {
    const notErrs = [];
    _validate(data, schema.not, path, notErrs, root);
    if (notErrs.length === 0) errors.push({ path, message: `value at ${path || '<root>'} should NOT match the "not" schema` });
  }
}

function validate(data, schema) {
  const errors = [];
  _validate(data, schema, '', errors, schema);
  return errors;
}

function fmtErrors(errors) {
  return errors.map(e => `  - ${e.path || '<root>'}: ${e.message}`).join('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('signals.schema.json', () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

  it('is a valid draft-07 JSON Schema with a title', () => {
    expect(schema.$schema).toMatch(/draft-07/);
    expect(schema.title).toBe('AgentSkin signals.json');
    expect(schema.definitions.rule).toBeDefined();
  });

  it('BUILTIN_RULES validate against the schema as the builtins layer', () => {
    const builtin = getBuiltinRules();
    const data = { rules: builtin };
    const errors = validate(data, schema);
    expect(errors, `BUILTIN_RULES should validate:\n${fmtErrors(errors)}`).toEqual([]);
  });

  it('accepts a project-layer override (replace + disable + new)', () => {
    const data = {
      $schema: '../signals.schema.json',
      rules: [
        {
          id: 'github/repos',
          family: 'github',
          description: 'Custom GitHub repos rule',
          match: { urlIncludes: ['api.github.com/repos/'] },
          signals: ['name', 'description', 'stargazers_count', 'language', 'license'],
          aliases: { stargazers_count: 'stars' },
          priority: 110,
        },
        { id: 'weather/open-meteo', disabled: true },
        {
          id: 'internal/jira',
          family: 'internal',
          description: 'Internal Jira',
          match: { urlIncludes: ['jira.acme.internal'] },
          signals: ['key', 'summary', 'status', 'assignee'],
          aliases: { key: 'id' },
        },
      ],
    };
    const errors = validate(data, schema);
    expect(errors, `project override should validate:\n${fmtErrors(errors)}`).toEqual([]);
  });

  it('accepts a user-layer reduce-signals override', () => {
    const data = {
      $schema: 'https://agentskin.dev/schemas/signals.schema.json',
      rules: [
        {
          id: 'github/repos',
          match: { urlIncludes: ['api.github.com/repos/'] },
          signals: ['name', 'description', 'stargazers_count'],
        },
      ],
    };
    const errors = validate(data, schema);
    expect(errors, `user reduce override should validate:\n${fmtErrors(errors)}`).toEqual([]);
  });

  it('accepts a pure disable directive', () => {
    const data = { rules: [{ id: 'github/issues', disabled: true }] };
    const errors = validate(data, schema);
    expect(errors, `disable directive should validate:\n${fmtErrors(errors)}`).toEqual([]);
  });

  it('rejects a rule missing the id', () => {
    const data = {
      rules: [{ match: { urlIncludes: ['api.example.com'] }, signals: ['name'] }],
    };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /"id"/.test(e.message))).toBe(true);
  });

  it('rejects an active rule missing signals', () => {
    const data = {
      rules: [{ id: 'foo/bar', match: { urlIncludes: ['api.example.com'] } }],
    };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /"signals"/.test(e.message))).toBe(true);
  });

  it('rejects a disable directive that also has signals (must be pure)', () => {
    const data = {
      rules: [{ id: 'foo/bar', disabled: true, signals: ['name'] }],
    };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an id that does not match the family/name pattern', () => {
    const data = {
      rules: [{ id: 'NoSlashes', match: { urlIncludes: ['x'] }, signals: ['name'] }],
    };
    const errors = validate(data, schema);
    expect(errors.some(e => /pattern/.test(e.message))).toBe(true);
  });

  it('rejects a match with neither urlIncludes nor urlIncludesAny', () => {
    const data = {
      rules: [{ id: 'foo/bar', match: {}, signals: ['name'] }],
    };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown top-level property in the file', () => {
    const data = { rules: [], unknownField: 'nope' };
    const errors = validate(data, schema);
    expect(errors.some(e => /unknownField/.test(e.message))).toBe(true);
  });

  it('rejects an unknown property inside a rule', () => {
    const data = {
      rules: [{
        id: 'foo/bar',
        match: { urlIncludes: ['x'] },
        signals: ['name'],
        suspiciousField: true,
      }],
    };
    const errors = validate(data, schema);
    expect(errors.some(e => /suspiciousField/.test(e.message))).toBe(true);
  });

  it('rejects a priority that is out of range', () => {
    const data = {
      rules: [{
        id: 'foo/bar',
        match: { urlIncludes: ['x'] },
        signals: ['name'],
        priority: 999999,
      }],
    };
    const errors = validate(data, schema);
    expect(errors.some(e => /maximum/.test(e.message))).toBe(true);
  });

  it('rejects disabled: false (only disabled: true is a valid disable directive)', () => {
    const data = { rules: [{ id: 'foo/bar', disabled: false }] };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a rule with neither match nor disabled (runtime would silently drop it)', () => {
    const data = { rules: [{ id: 'foo/bar' }] };
    const errors = validate(data, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => /anyOf/.test(e.message))).toBe(true);
  });
});
