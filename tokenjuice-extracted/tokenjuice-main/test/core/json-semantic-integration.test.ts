import { describe, it, expect } from "vitest";
import { reduceExecutionWithRules } from "../../src/core/reduce.js";
import { loadRules } from "../../src/core/rules.js";
import type { ToolExecutionInput } from "../../src/types.js";

describe("json-semantic integration", () => {
  it("reduces a GitHub API curl response via jsonSemantic rule", async () => {
    const input: ToolExecutionInput = {
      toolName: "exec",
      argv: ["curl", "https://api.github.com/repos/vercel/next.js"],
      command: "curl https://api.github.com/repos/vercel/next.js",
      combinedText: JSON.stringify({
        id: 70107586,
        name: "next.js",
        full_name: "vercel/next.js",
        description: "The React Framework",
        stargazers_count: 118000,
        language: "JavaScript",
        forks_count: 25000,
        open_issues_count: 1500,
        watchers_count: 118000,
        topics: ["react", "framework", "ssr", "nextjs"],
        license: { key: "mit", name: "MIT License" },
        default_branch: "canary",
        created_at: "2016-10-05T22:56:11Z",
        updated_at: "2024-01-01T00:00:00Z",
        pushed_at: "2024-01-01T00:00:00Z",
        size: 500000,
        archived: false,
        disabled: false,
        node_id: "MDEwOlJlcG9zaXRvcnk3MDEwNzU4Ng==",
        private: false,
        html_url: "https://github.com/vercel/next.js",
        clone_url: "https://github.com/vercel/next.js.git",
        ssh_url: "git@github.com:vercel/next.js.git",
        svn_url: "https://github.com/vercel/next.js",
        homepage: "https://nextjs.org",
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        has_discussions: true,
        network_count: 25000,
        subscribers_count: 3000,
      }),
      exitCode: 0,
    };

    const rules = await loadRules();
    const result = await reduceExecutionWithRules(input, rules);

    // The result should use semantic pruning (not generic/json fallback)
    expect(result.classification.matchedReducer).toBe("network/curl-github");
    expect(result.classification.family).toBe("network-http");

    // The inlineText should contain signal keys with aliases
    expect(result.inlineText).toContain("name: next.js");
    expect(result.inlineText).toContain("description:");

    // It should NOT contain raw JSON keys that aren't signals
    expect(result.inlineText).not.toContain("node_id");
    expect(result.inlineText).not.toContain("html_url");

    // Verify meaningful compaction
    expect(result.stats.rawChars).toBeGreaterThan(500);
    expect(result.stats.reducedChars).toBeLessThan(result.stats.rawChars);
  });

  it("falls through to normal rule processing for non-JSON curl output", async () => {
    const input: ToolExecutionInput = {
      toolName: "exec",
      argv: ["curl", "https://example.com"],
      command: "curl https://example.com",
      combinedText: "HTTP/2 200\ncontent-type: text/html\nHello World",
      exitCode: 0,
    };

    const rules = await loadRules();
    const result = await reduceExecutionWithRules(input, rules);

    // Should match the regular curl rule, not curl-github
    expect(result.classification.matchedReducer).toBe("network/curl");
    expect(result.inlineText).toContain("Hello World");
  });

  it("does not apply json-semantic when smallThreshold prevents it", async () => {
    const input: ToolExecutionInput = {
      toolName: "exec",
      argv: ["curl", "https://api.github.com/repos/tiny/repo"],
      command: "curl https://api.github.com/repos/tiny/repo",
      combinedText: JSON.stringify({ name: "tiny", id: 1 }),
      exitCode: 0,
    };

    const rules = await loadRules();
    const result = await reduceExecutionWithRules(input, rules);

    // For tiny JSON, json-semantic may not apply (below threshold)
    // but the rule should still match
    expect(result.classification.matchedReducer).toBe("network/curl-github");
  });
});
