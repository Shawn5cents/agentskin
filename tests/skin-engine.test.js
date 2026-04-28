import { describe, it, expect } from 'vitest';
import { recursive_prune, to_markdown_skin } from '../backend/lib/skin-engine.js';

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
});