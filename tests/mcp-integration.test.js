import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { isSafeUrl } from '../backend/mcp.js';

// Integration tests for MCP server security and functionality
// Tests the actual server process via stdio

describe('MCP Security Tests', () => {
  describe('isSafeUrl - SSRF Protection', () => {
    it('blocks localhost and variants', () => {
      expect(isSafeUrl('http://localhost')).toBe(false);
      expect(isSafeUrl('http://localhost:3000')).toBe(false);
      expect(isSafeUrl('http://127.0.0.1')).toBe(false);
      expect(isSafeUrl('http://127.0.0.1:8080')).toBe(false);
    });

    it('blocks private IPv4 ranges', () => {
      expect(isSafeUrl('http://10.0.0.1')).toBe(false);
      expect(isSafeUrl('http://10.255.255.255')).toBe(false);
      expect(isSafeUrl('http://172.16.0.1')).toBe(false);
      expect(isSafeUrl('http://172.31.255.255')).toBe(false);
      expect(isSafeUrl('http://192.168.1.1')).toBe(false);
    });

    it('blocks link-local addresses', () => {
      expect(isSafeUrl('http://169.254.169.254')).toBe(false);
      expect(isSafeUrl('http://0.0.0.0')).toBe(false);
    });

    it('blocks IPv6 private ranges', () => {
      expect(isSafeUrl('http://[::1]')).toBe(false);
      expect(isSafeUrl('http://[::]')).toBe(false);
      expect(isSafeUrl('http://[fe80::1]')).toBe(false);
      expect(isSafeUrl('http://[fc00::1]')).toBe(false);
      expect(isSafeUrl('http://[::ffff:127.0.0.1]')).toBe(false);
    });

    it('blocks cloud metadata services', () => {
      expect(isSafeUrl('http://metadata.google.internal/')).toBe(false);
      expect(isSafeUrl('http://metadata.goog/')).toBe(false);
      expect(isSafeUrl('http://metadata.azure.com/')).toBe(false);
      expect(isSafeUrl('http://kubernetes.default.svc/')).toBe(false);
    });

    it('blocks non-http protocols', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('ftp://example.com')).toBe(false);
      expect(isSafeUrl('gopher://example.com')).toBe(false);
    });

    it('allows public URLs', () => {
      expect(isSafeUrl('https://api.github.com/users')).toBe(true);
      expect(isSafeUrl('https://httpbin.org/get')).toBe(true);
      expect(isSafeUrl('https://api.weather.gov/gridpoints/TOP/31,80/forecast')).toBe(true);
    });
  });

  describe('MCP Server Startup', () => {
    let server;
    let stdoutData = [];
    let stderrData = [];

    afterEach(() => {
      if (server) {
        server.kill();
      }
    });

    it('starts and outputs startup message', (done) => {
      server = spawn('node', ['backend/mcp.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      server.stderr.on('data', (data) => {
        stderrData.push(data.toString());
      });

      server.stdout.on('data', (data) => {
        stdoutData.push(data.toString());
      });

      setTimeout(() => {
        const stderr = stderrData.join('');
        expect(stderr).toContain('AgentSkin MCP Server running via Stdio');
        done();
      }, 500);
    });

    it('responds to tools/list request', (done) => {
      server = spawn('node', ['backend/mcp.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let responseData = [];

      server.stdout.on('data', (data) => {
        responseData.push(data.toString());
      });

      setTimeout(() => {
        const request = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        });
        server.stdin.write(request + '\n');

        setTimeout(() => {
          const response = responseData.join('');
          expect(response).toContain('fetch_optimized_data');
          expect(response).toContain('skin_reasoning');
          done();
        }, 500);
      }, 500);
    });
  });
});

describe('fetch_optimized_data Edge Cases', () => {
  it('validates URL format via Zod schema', () => {
    // This tests the schema validation logic
    const validUrls = [
      'https://api.github.com/users',
      'http://example.com/path?query=1',
      'https://httpbin.org/json'
    ];

    for (const url of validUrls) {
      expect(() => new URL(url)).not.toThrow();
      expect(isSafeUrl(url)).toBe(true);
    }
  });

  it('rejects malformed URLs', () => {
    const invalidUrls = [
      'not-a-url',
      '',
      'javascript:alert(1)',
      'file:///etc/passwd'
    ];

    for (const url of invalidUrls) {
      expect(isSafeUrl(url)).toBe(false);
    }
  });
});

describe('skin_reasoning Edge Cases', () => {
  it('handles empty text', () => {
    const { skinReasoning } = require('../backend/lib/reasoning-skin.js');
    const result = skinReasoning('');
    expect(result.skin).toBe('');
  });

  it('handles text with only filler words', () => {
    const { skinReasoning } = require('../backend/lib/reasoning-skin.js');
    const result = skinReasoning('basically actually really very obviously');
    expect(result.skin.trim()).toBe('');
  });

  it('preserves meaningful content', () => {
    const { skinReasoning } = require('../backend/lib/reasoning-skin.js');
    const result = skinReasoning('The temperature is 72 degrees fahrenheit.');
    expect(result.skin).toContain('72');
    expect(result.skin).toContain('fahrenheit');
  });
});