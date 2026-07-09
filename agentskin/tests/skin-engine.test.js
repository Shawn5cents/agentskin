import { describe, it, expect } from 'vitest';
import { recursive_prune, to_markdown_skin, analyze_compression } from '../backend/lib/skin-engine.js';

describe('skin-engine', () => {
  it('prunes nested object to signals only', () => {
    const input = {
      metadata: { api_version: '1.0' },
      current_weather: {
        temperature_2m: 22.5,
        windspeed_10m: 10.2,
        is_day: 1
      }
    };
    const signals = ['temp', 'wind'];
    const aliases = { 'temperature_2m': 'temp', 'windspeed_10m': 'wind' };
    const result = recursive_prune(input, signals, aliases);
    expect(result).toEqual({
      current_weather: {
        temp: 22.5,
        wind: 10.2
      }
    });
  });

  it('filters arrays', () => {
    const input = [
      { id: 1, name: 'foo', junk: 'bar' },
      { id: 2, junk: 'baz' }
    ];
    const signals = ['id', 'name'];
    const result = recursive_prune(input, signals);
    expect(result).toEqual([
      { id: 1, name: 'foo' },
      { id: 2 }
    ]);
  });

  it('flattens to markdown', () => {
    const input = {
      temp: 22.5,
      wind: 10.2,
      periods: [{ forecast: 'Sunny' }]
    };
    const md = to_markdown_skin(input, 'Weather', 1000);
    expect(md.startsWith('[Weather]\n')).toBe(true);
    expect(md).toContain('temp: 22.5');
    expect(md).toContain('wind: 10.2');
    expect(md).toContain('periods.forecast: Sunny');
  });

  it('skips title for small data', () => {
    const md = to_markdown_skin({ temp: 22 }, '', 100);
    expect(md).not.toMatch(/^\[.*\]/);
  });

  // Edge cases
  it('handles empty object', () => {
    const result = recursive_prune({}, ['id']);
    expect(result).toBeNull();
  });

  it('handles null input', () => {
    const result = recursive_prune(null, ['id']);
    expect(result).toBeNull();
  });

  it('handles empty array', () => {
    const result = recursive_prune([], ['id']);
    expect(result).toEqual([]);
  });

  it('handles deeply nested objects', () => {
    const input = {a:{b:{c:{d:{id:1}}}}};
    const result = recursive_prune(input, ['id']);
    expect(result).toEqual({a:{b:{c:{d:{id:1}}}}});
  });

  it('handles array of empty objects', () => {
    const input = [{ id: 1 }, {}, { id: 2 }];
    const result = recursive_prune(input, ['id']);
    // Empty objects are pruned to null, which are then filtered out from arrays
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('to_markdown_skin edge cases', () => {
  it('handles arrays of objects', () => {
    const input = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    const md = to_markdown_skin(input, '', 1000);
    expect(md).toContain('id: 1');
    expect(md).toContain('id: 2');
  });

  it('handles null/undefined input gracefully', () => {
    expect(() => to_markdown_skin(null, '', 1000)).not.toThrow();
    expect(() => to_markdown_skin(undefined, '', 1000)).not.toThrow();
  });
});

describe('analyze_compression', () => {
  it('calculates savings correctly', () => {
    const raw = { items: Array(100).fill({ id: 1, name: 'x', junk: 'y' }) };
    const skin = 'id: 1\nname: x';
    const result = analyze_compression(raw, skin);
    expect(result.applied).toBe(true);
    expect(result.savings_ratio).toContain('%');
  });

  it('returns no savings when skin is larger', () => {
    const raw = { id: 1 };
    const skin = 'id: 1 (larger because of extra text here)';
    const result = analyze_compression(raw, skin);
    expect(result.applied).toBe(false);
    expect(result.savings_ratio).toBe('0.00%');
  });
});