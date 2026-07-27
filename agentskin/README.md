# AgentSkin Suite

[![npm version](https://img.shields.io/npm/v/agentskin.svg)](https://npmjs.org/package/agentskin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stop paying for noise.** AgentSkin Suite cuts your AI API costs by 60-80% by stripping token waste from API responses, terminal output, and agent replies — automatically.

## What You Get

One MCP server. Seven tools. Three layers of savings.

| Layer | Cuts | How |
|-------|------|-----|
| **API responses** | 60–88% | Strips junk fields from JSON before your AI sees them |
| **Terminal output** | Up to 99.97% | Compacts CLI noise (build logs, git diffs, lint spam) |
| **Agent replies** | 65% | Makes your AI talk like a caveman — same info, fewer words |

## 30-Second Install

```bash
npx -y agentskin@latest
```

Then add to your MCP config:

```json
{
  "mcpServers": {
    "agentskin-suite": {
      "command": "npx",
      "args": ["-y", "agentskin@latest"]
    }
  }
}
```

That's it. Restart your AI tool and you have all 7 tools.

## What It Actually Does

**Before:** Your AI fetches `https://api.github.com/repos/vercel/next.js` and gets 1,544 tokens of JSON — mostly URLs, timestamps, boolean flags you don't need.

**After:** 180 tokens. Just the fields that matter: name, description, stars, language, topics, URL.

Same answer quality. 88% cheaper API calls.

## The 7 Tools

| Tool | Use it when... |
|------|---------------|
| `fetch_optimized_data` | You need data from any API or webpage |
| `skin_reasoning` | Text is full of hedging and filler words |
| `classify_url` | You want to know which rules will apply to a URL |
| `strip_ansi` | Terminal output has color codes in it |
| `reduce` | CLI output is massive (build logs, diffs, listings) |
| `estimate_tokens` | You need to know how many tokens something costs |
| `apply_json_semantic` | You have raw JSON you want to prune |

## Supported AI Tools

Works with anything that supports MCP: Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Codex, Copilot, Kilo Code, OpenCode, and more.

Also includes 6 Caveman skills that work across 30+ agents — compressed output, commits, code reviews, file compression, and subagent delegation.

## Numbers

- GitHub API: **88.3% savings** (1,544 → 180 tokens)
- Large directory listing: **99.97% savings** (3.2M → 897 chars)
- Agent output: **65% smaller**
- Test suite: **4,695 tests, 274 files, 100% passing**

## Docs

- [Full Usage Guide](./USAGE.md) — step-by-step setup for every tool
- [FAQ](./docs/FAQ.md) — common questions with real benchmarks
- [Website](https://agentskin.dev) — live docs, examples, whitepaper

## Security

Everything runs locally. No data leaves your machine. SSRF protection, rate limiting, input validation, and URL sanitization built in.

## Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, Suite integration |
| **Vincent Koc** | Tokenjuice — [MIT License](https://github.com/vincentkoc/tokenjuice) |
| **Julius Brussee** | Caveman — [github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |

*Maintained by Nichols Transco LLC.*
