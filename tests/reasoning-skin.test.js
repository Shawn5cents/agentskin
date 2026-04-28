import { describe, it, expect } from 'vitest';
import { skinReasoning } from '../backend/lib/reasoning-skin.js';

describe('reasoning-skin', () => {
  it('strips hedge words', () => {
    const input = 'I think perhaps it might be sunny, but maybe not.';
    const { skin } = skinReasoning(input);
    expect(skin).toContain('sunny');
    expect(skin.length).toBeLessThan(input.length);
    expect(skin).not.toContain('perhaps');
    expect(skin).not.toContain('might');
  });

  it('removes fillers', () => {
    const input = 'Basically, you know, I mean, it is actually very clear.';
    const { skin } = skinReasoning(input);
    expect(skin.length).toBeLessThan(input.length);
    expect(skin).not.toContain('Basically');
    expect(skin).not.toContain('actually');
    expect(skin).not.toContain('very');
  });

  it('collapses redundancies', () => {
    const input = 'It is very really important.';
    const { skin } = skinReasoning(input);
    expect(skin.trim()).toBe('It is important.');
    expect(skin.length).toBeLessThan(input.length);
  });
});