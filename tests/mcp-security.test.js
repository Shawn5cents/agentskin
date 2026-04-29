import { describe, it, expect } from 'vitest';
import { htmlToText, isHtmlContent, isSafeUrl } from '../backend/mcp.js';

describe('isSafeUrl', () => {
  // Allowed URLs
  it('allows standard public URLs', () => {
    expect(isSafeUrl('https://api.github.com/users')).toBe(true);
    expect(isSafeUrl('https://httpbin.org/get')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
  });

  it('allows URLs with ports', () => {
    expect(isSafeUrl('https://example.com:8080/api')).toBe(true);
  });

  // Blocked URLs - IPv4 private ranges
  it('blocks localhost variants', () => {
    expect(isSafeUrl('http://localhost')).toBe(false);
    expect(isSafeUrl('http://localhost:3000')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1:8080')).toBe(false);
  });

  it('blocks 10.x.x.x range', () => {
    expect(isSafeUrl('http://10.0.0.1')).toBe(false);
    expect(isSafeUrl('http://10.255.255.255')).toBe(false);
    expect(isSafeUrl('http://10.1.2.3')).toBe(false);
  });

  it('blocks 172.16.x.x - 172.31.x.x range', () => {
    expect(isSafeUrl('http://172.16.0.1')).toBe(false);
    expect(isSafeUrl('http://172.31.255.255')).toBe(false);
    expect(isSafeUrl('http://172.20.0.1')).toBe(false);
  });

  it('blocks 192.168.x.x range', () => {
    expect(isSafeUrl('http://192.168.1.1')).toBe(false);
    expect(isSafeUrl('http://192.168.0.254')).toBe(false);
  });

  it('blocks 169.254.x.x link-local', () => {
    expect(isSafeUrl('http://169.254.169.254')).toBe(false);
  });

  it('blocks 0.0.0.0', () => {
    expect(isSafeUrl('http://0.0.0.0')).toBe(false);
  });

  // Blocked URLs - IPv6 private ranges
  it('blocks IPv6 loopback', () => {
    expect(isSafeUrl('http://[::1]')).toBe(false);
    expect(isSafeUrl('http://[::1]:8080')).toBe(false);
  });

  it('blocks IPv6 empty', () => {
    expect(isSafeUrl('http://[::]')).toBe(false);
  });

  it('blocks IPv6 link-local fe80:', () => {
    expect(isSafeUrl('http://[fe80::1]')).toBe(false);
    expect(isSafeUrl('http://[fe80::1%eth0]')).toBe(false);
    expect(isSafeUrl('http://[fe80::1%25eth0]')).toBe(false);
  });

  it('blocks IPv6 unique local fc00:', () => {
    expect(isSafeUrl('http://[fc00::1]')).toBe(false);
  });

  it('blocks IPv4-mapped IPv6', () => {
    expect(isSafeUrl('http://[::ffff:127.0.0.1]')).toBe(false);
    expect(isSafeUrl('http://[::ffff:10.0.0.1]')).toBe(false);
    expect(isSafeUrl('http://[::ffff:192.168.1.1]')).toBe(false);
  });

  // Protocol validation
  it('blocks non-http protocols', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeUrl('ftp://example.com')).toBe(false);
    expect(isSafeUrl('gopher://example.com')).toBe(false);
  });

  // Invalid URLs
  it('returns false for invalid URLs', () => {
    expect(isSafeUrl('not-a-url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('isHtmlContent', () => {
  it('detects text/html', () => {
    expect(isHtmlContent('text/html')).toBe(true);
    expect(isHtmlContent('text/html; charset=utf-8')).toBe(true);
    expect(isHtmlContent('text/html;charset=UTF-8')).toBe(true);
  });

  it('detects application/xhtml+xml', () => {
    expect(isHtmlContent('application/xhtml+xml')).toBe(true);
  });

  it('rejects JSON content types', () => {
    expect(isHtmlContent('application/json')).toBe(false);
    expect(isHtmlContent('application/vnd.api+json')).toBe(false);
    expect(isHtmlContent('text/plain')).toBe(false);
  });

  it('handles null/undefined', () => {
    expect(isHtmlContent(null)).toBe(false);
    expect(isHtmlContent(undefined)).toBe(false);
    expect(isHtmlContent('')).toBe(false);
  });
});

describe('htmlToText', () => {
  it('extracts title', () => {
    const html = '<html><head><title>Test Page</title></head><body></body></html>';
    const result = htmlToText(html);
    expect(result.title).toBe('Test Page');
  });

  it('extracts h1', () => {
    const html = '<html><body><h1>Main Heading</h1></body></html>';
    const result = htmlToText(html);
    expect(result.h1).toBe('Main Heading');
  });

  it('extracts h2 and h3 headings', () => {
    const html = '<html><body><h2>Section 1</h2><h3>Subsection</h3></body></html>';
    const result = htmlToText(html);
    expect(result.h2).toEqual(['Section 1', 'Subsection']);
  });

  it('extracts meta description', () => {
    const html = '<html><head><meta name="description" content="Page description"></head><body></body></html>';
    const result = htmlToText(html);
    expect(result.meta_description).toBe('Page description');
  });

  it('extracts body text', () => {
    const html = '<html><body><p>Paragraph one.</p><p>Paragraph two.</p></body></html>';
    const result = htmlToText(html);
    expect(result.body_text).toContain('Paragraph one');
    expect(result.body_text).toContain('Paragraph two');
  });

  it('removes script content', () => {
    const html = '<html><body><p>Visible</p><script>console.log("hidden");</script></body></html>';
    const result = htmlToText(html);
    expect(result.body_text).toContain('Visible');
    expect(result.body_text).not.toContain('hidden');
  });

  it('removes style content', () => {
    const html = '<html><body><p>Content</p><style>.hidden { display: none; }</style></body></html>';
    const result = htmlToText(html);
    expect(result.body_text).toContain('Content');
    expect(result.body_text).not.toContain('.hidden');
  });

  it('strips javascript: URLs from links', () => {
    const html = '<html><body><a href="javascript:alert(1)">Click me</a><a href="https://safe.com">Safe link</a></body></html>';
    const result = htmlToText(html);
    expect(result.links).toBeDefined();
    const jsLink = result.links.find(l => l.text === 'Click me');
    expect(jsLink.href).toBe('');
    const safeLink = result.links.find(l => l.text === 'Safe link');
    expect(safeLink.href).toBe('https://safe.com');
  });

  it('strips data: URLs from links', () => {
    const html = '<html><body><a href="data:text/html,<h1>bad</h1>">Bad link</a></body></html>';
    const result = htmlToText(html);
    const link = result.links[0];
    expect(link.href).toBe('');
  });

  it('limits links to 10', () => {
    const links = Array.from({ length: 15 }, (_, i) => `<a href="https://link${i}.com">Link ${i}</a>`).join('');
    const html = `<html><body>${links}</body></html>`;
    const result = htmlToText(html);
    expect(result.links.length).toBe(10);
  });

  it('omits undefined fields', () => {
    const html = '<html><body><p>Just body text</p></body></html>';
    const result = htmlToText(html);
    expect(result.title).toBeUndefined();
    expect(result.h1).toBeUndefined();
  });

  it('handles malformed HTML', () => {
    const html = '<html><body><p>Unclosed paragraph<body></html>';
    const result = htmlToText(html);
    expect(result.body_text).toContain('Unclosed paragraph');
  });

  it('collapses multiple whitespace', () => {
    const html = '<html><body><p>Text   with\n\nlots   of    spaces</p></body></html>';
    const result = htmlToText(html);
    expect(result.body_text).toBe('Text with lots of spaces');
  });
});
