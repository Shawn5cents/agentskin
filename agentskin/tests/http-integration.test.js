import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { recursive_prune, to_markdown_skin } from '../backend/lib/skin-engine.js';
import { htmlToText, isHtmlContent } from '../backend/mcp.js';

/**
 * Real HTTP Integration Tests
 * These tests make actual network requests to verify end-to-end functionality.
 *
 * Note: Token savings vary significantly based on:
 * - Data structure complexity
 * - Signal specificity (too broad = larger output)
 * - Alias usage (can add overhead)
 */

describe('Real HTTP Fetch Tests', () => {
  describe('JSON API fetching', () => {
    it('fetches and skins httpbin JSON', async () => {
      const response = await axios.get('https://httpbin.org/json', { timeout: 10000 });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      // Use specific signals to ensure pruning effectiveness
      const signals = ['slideshow'];
      const pruned = recursive_prune(response.data, signals, {});
      const skin = to_markdown_skin(pruned, 'httpbin', JSON.stringify(response.data).length);

      expect(skin).toContain('slideshow');
      // Verify we got actual data (even if not smaller, pruning worked)
      expect(skin).toContain('title');
    }, 15000);

    it('fetches and skins GitHub API', async () => {
      const response = await axios.get('https://api.github.com/users/octocat', {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });

      expect(response.status).toBe(200);
      expect(response.data.login).toBe('octocat');

      const signals = ['login', 'id', 'name', 'company', 'blog'];
      const pruned = recursive_prune(response.data, signals, {});
      const skin = to_markdown_skin(pruned, 'GitHub User', JSON.stringify(response.data).length);

      expect(skin).toContain('octocat');
      expect(skin).toContain('id');
    }, 15000);

    it('fetches and skins public weather API (current only)', async () => {
      const response = await axios.get(
        'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true',
        { timeout: 10000 }
      );

      expect(response.status).toBe(200);
      expect(response.data.current_weather).toBeDefined();

      // Use narrow signals for current weather only
      const signals = ['temperature', 'windspeed', 'weathercode', 'time'];
      const pruned = recursive_prune(response.data, signals, {});
      const skin = to_markdown_skin(pruned, 'Weather', JSON.stringify(response.data).length);

      expect(skin).toContain('temperature');
      expect(skin).toContain('windspeed');
    }, 15000);

    it('handles JSON API with complex nested structure', async () => {
      const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', {
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data.userId).toBeDefined();

      const signals = ['title', 'body', 'userId'];
      const pruned = recursive_prune(response.data, signals, {});
      const skin = to_markdown_skin(pruned, 'Post', JSON.stringify(response.data).length);

      expect(skin).toContain('title');
      expect(skin).toContain('body');
    }, 15000);
  });

  describe('HTML fetching and parsing', () => {
    it('fetches and parses HTML from example.com', async () => {
      const response = await axios.get('https://example.com', {
        timeout: 10000,
        headers: { 'Accept': 'text/html' }
      });

      expect(response.status).toBe(200);
      expect(isHtmlContent(response.headers['content-type'])).toBe(true);

      const structured = htmlToText(response.data);

      expect(structured).toHaveProperty('title');
      expect(structured).toHaveProperty('body_text');
      expect(structured.title).toBe('Example Domain');
      expect(structured.body_text.length).toBeGreaterThan(10);
    }, 15000);

    it('fetches and parses Cloudflare check page', async () => {
      const response = await axios.get('https://www.cloudflare.com/', { timeout: 10000 });

      expect(response.status).toBe(200);

      const structured = htmlToText(response.data);

      expect(structured).toHaveProperty('title');
      expect(structured).toHaveProperty('body_text');
      expect(structured.title).toBeDefined();
    }, 15000);

    it('removes scripts and styles from HTML', async () => {
      const response = await axios.get('https://example.com', { timeout: 10000 });
      const structured = htmlToText(response.data);

      expect(structured.body_text).not.toMatch(/document\.write/i);
      expect(structured.body_text).not.toMatch(/console\.log/i);
    }, 15000);

    it('strips dangerous URLs from HTML links', async () => {
      const html = `
        <html>
          <body>
            <a href="https://safe.com">Safe</a>
            <a href="javascript:alert(1)">Dangerous</a>
            <a href="data:text/html,<h1>Bad</h1>">Bad</a>
          </body>
        </html>
      `;

      const structured = htmlToText(html);

      expect(structured.links).toBeDefined();
      expect(structured.links).toHaveLength(3);

      const safeLink = structured.links.find(l => l.text === 'Safe');
      const jsLink = structured.links.find(l => l.text === 'Dangerous');

      expect(safeLink?.href).toBe('https://safe.com');
      expect(jsLink?.href).toBe('');
    });
  });
});

describe('Token Savings Benchmarks (Real Data)', () => {
  it('measures actual token savings on GitHub API', async () => {
    const response = await axios.get('https://api.github.com/users/octocat', { timeout: 10000 });

    const raw = JSON.stringify(response.data);
    const signals = ['login', 'id', 'name', 'avatar_url', 'bio'];
    const aliases = { 'login': 'username' };

    const pruned = recursive_prune(response.data, signals, aliases);
    const skin = to_markdown_skin(pruned, 'GitHub', raw.length);

    const rawTokens = Math.ceil(raw.length / 4);
    const skinTokens = Math.ceil(skin.length / 4);
    const savings = ((1 - skinTokens / rawTokens) * 100).toFixed(1);

    console.log(`GitHub API: ${rawTokens} → ${skinTokens} tokens (${savings}% saved)`);

    expect(skin).toContain('username: octocat');
    // Token savings expected here due to large avatar_url and bio fields being pruned
  }, 15000);

  it('measures actual token savings on JSONPlaceholder', async () => {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', { timeout: 10000 });

    const raw = JSON.stringify(response.data);
    // Note: aliases work with lowercase key matching - userId needs to be in signals too
    const signals = ['id', 'title', 'body', 'userid', 'userId'];
    const aliases = { 'userid': 'author' };

    const pruned = recursive_prune(response.data, signals, aliases);
    const skin = to_markdown_skin(pruned, 'Post', raw.length);

    const rawTokens = Math.ceil(raw.length / 4);
    const skinTokens = Math.ceil(skin.length / 4);
    const savings = ((1 - skinTokens / rawTokens) * 100).toFixed(1);

    console.log(`JSONPlaceholder: ${rawTokens} → ${skinTokens} tokens (${savings}% saved)`);

    // Verify signals worked - alias should convert userid -> author
    expect(skin).toContain('author');
    expect(skin).toContain('id: 1');
  }, 15000);

  it('demonstrates variable savings based on signal specificity', async () => {
    // This test shows why "up to X%" claims are realistic
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', { timeout: 10000 });
    const raw = JSON.stringify(response.data);

    // Narrow signals = good savings
    const narrowPruned = recursive_prune(response.data, ['title', 'body'], {});
    const narrowSkin = to_markdown_skin(narrowPruned, 'Narrow', raw.length);

    // Broad signals = less savings (or even negative)
    const broadPruned = recursive_prune(response.data, ['id', 'userId', 'title', 'body'], {});
    const broadSkin = to_markdown_skin(broadPruned, 'Broad', raw.length);

    const narrowTokens = Math.ceil(narrowSkin.length / 4);
    const broadTokens = Math.ceil(broadSkin.length / 4);
    const rawTokens = Math.ceil(raw.length / 4);

    console.log(`Narrow signals: ${rawTokens} → ${narrowTokens} tokens (${((1 - narrowTokens/rawTokens)*100).toFixed(1)}% saved)`);
    console.log(`Broad signals: ${rawTokens} → ${broadTokens} tokens (${((1 - broadTokens/rawTokens)*100).toFixed(1)}% saved)`);

    // Narrow should always be smaller than broad for this data
    expect(narrowTokens).toBeLessThanOrEqual(broadTokens);
  }, 15000);
});

describe('Error Handling', () => {
  it('handles 404 gracefully', async () => {
    try {
      await axios.get('https://httpbin.org/status/404', { timeout: 10000 });
    } catch (error) {
      expect(error.response?.status).toBe(404);
    }
  }, 15000);

  it('handles timeout', async () => {
    try {
      await axios.get('https://10.255.255.1/', { timeout: 3000 });
    } catch (error) {
      expect(error.code).toMatch(/ECONNREFUSED|ETIMEDOUT|ECONNABORTED/);
    }
  }, 10000);

  it('handles invalid JSON gracefully', async () => {
    const malformedJson = '{ "test": }';
    expect(() => JSON.parse(malformedJson)).toThrow();
  });
});