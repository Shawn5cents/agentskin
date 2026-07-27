# AgentSkin Suite — Usage Guide

Step-by-step directions for installing, configuring, and using every tool in the suite.

---

## 1. Install the MCP Server

The MCP server gives your AI assistant 7 tools for token optimization.

### Option A: npx (no install, always latest)

```bash
npx -y agentskin@latest
```

### Option B: Global install

```bash
npm install -g agentskin
agentskin
```

### Option C: Project install

```bash
npm install agentskin
npx agentskin
```

---

## 2. Configure Your AI Tool

Add the MCP server to your tool's config. Pick your tool below.

### Claude Desktop

Edit `claude_desktop_config.json` (Claude → Settings → Developer → Edit Config):

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

Restart Claude Desktop.

### Claude Code / OpenCode / Codex CLI

Add to `.mcp.json` in your project root or home directory:

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

### Cursor

Cursor → Settings → MCP → Add New MCP Server:

- Name: `agentskin-suite`
- Type: `command`
- Command: `npx -y agentskin@latest`

### Windsurf / Cline / Other

Same pattern — add an MCP server with command `npx` and args `-y agentskin@latest`.

---

## 3. Verify It's Working

Ask your AI assistant:

> "List your available MCP tools."

You should see these 7 tools: `fetch_optimized_data`, `skin_reasoning`, `classify_url`, `strip_ansi`, `reduce`, `estimate_tokens`, `apply_json_semantic`.

---

## 4. Using Each Tool

### `fetch_optimized_data` — Prune API Responses

**When:** You're fetching data from GitHub, npm, weather APIs, Reddit, HackerNews, or any JSON API.

**How to ask your AI:**
> "Use fetch_optimized_data to get https://api.github.com/repos/facebook/react"

No extra parameters needed for supported APIs — auto-classification handles it.

**For custom APIs, provide signals:**
> "Use fetch_optimized_data on https://pokeapi.co/api/v2/pokemon/ditto with signals: [name, height, weight, abilities]"

**What happens:**
- Before: 1,544 tokens of raw GitHub API JSON
- After: ~180 tokens with only the meaningful fields

### `skin_reasoning` — Strip Filler Words

**When:** Text has too much hedging ("I think", "perhaps", "it might be worth considering").

**How to ask:**
> "Use skin_reasoning on this text:..."

Removes 14-29% of tokens by cutting linguistic fluff. Preserves facts.

### `classify_url` — Check API Rules

**When:** You want to know if a URL has built-in pruning rules.

**How to ask:**
> "Use classify_url on https://api.github.com/search/repositories?q=rust"

Returns the matching rule family (github, npm, weather, etc.) or "generic" if none.

### `strip_ansi` — Clean Terminal Output

**When:** Text contains ANSI color codes (looks like `[31m`, `[0m`, etc).

**How to ask:**
> "Use strip_ansi on this terminal output:..."

Removes 5 patterns of ANSI escape sequences.

### `reduce` — Compact CLI Output

**When:** Terminal command output is massive (build logs, `ls -laR`, git diff, npm install).

**How to ask:**
> "I ran `npm install` and got a huge output. Use reduce with command: 'npm install' and output: [paste output]"

Uses 136 rules to compact specific command outputs. Up to 99.97% reduction.

### `estimate_tokens` — Count Token Cost

**When:** You need to know how much something will cost in tokens.

**How to ask:**
> "Use estimate_tokens on this text:..."

Returns approximate token count (chars ÷ 4, grapheme-aware).

### `apply_json_semantic` — Prune Raw JSON

**When:** You have JSON but no URL to fetch — you just want to prune it.

**How to ask:**
> "Use apply_json_semantic on this JSON: [paste] with signals: [name, url, description]"

Same pruning as `fetch_optimized_data` but works on raw JSON strings.

---

## 5. Bash Hook (Optional — Transparent CLI Optimization)

The bash hook automatically compacts terminal output before your AI sees it. Zero effort after setup.

### Install

```bash
# From the agentskin suite directory
source suite/hooks/bash-optimizer.sh

# Or add to your shell permanently
echo "source $(pwd)/suite/hooks/bash-optimizer.sh" >> ~/.bashrc
source ~/.bashrc
```

### Usage

Prefix any CLI command with `opt`:

```bash
# Before (raw output to AI)
ls -laR node_modules/

# After (compacted output to AI)
opt ls -laR node_modules/
```

The hook intercepts the output and runs it through Tokenjuice compaction before your AI tool reads it. 17.1% net session savings with zero overhead.

### Supported commands (auto-detected)

The hook auto-detects and optimizes: `ls`, `find`, `npm`, `git`, `docker`, `cargo`, `go`, `pip`, `apt`, `yarn`, `pnpm`, `make`, `grep`, `cat`, `tail`, `head`, and more.

---

## 6. Caveman Skills (Optional — Compressed AI Output)

Caveman makes your AI agent give shorter answers. Same information, 65% fewer tokens.

### How it works

Caveman is a set of `.md` skill files that AI agents auto-discover from your project or home directory. Place them in `.agents/skills/` or `.claude/skills/`.

### Available skills

| Skill | Command trigger | What it does |
|-------|----------------|-------------|
| `caveman` | "caveman mode" | Cuts output by 65% — fragments instead of paragraphs |
| `caveman-commit` | "write a commit" | Generates terse Conventional Commits |
| `caveman-review` | "review this PR" | One-line review: location, problem, fix |
| `caveman-stats` | "caveman stats" | Shows real measured savings for the session |
| `caveman-compress` | "compress this file" | Rewrites markdown files 46% smaller |
| `cavecrew` | "delegate to subagent" | Spawns compressed subagents for search/edit/review |

### Install

Caveman skills are auto-discovered by AI agents when placed in your skills directory:

```bash
# Claude Code / Codex / OpenCode
cp -r suite/skills/* ~/.agents/skills/

# Claude Desktop
cp -r suite/skills/* ~/.claude/skills/
```

Then tell your AI: "Enable caveman mode."

---

## 7. Putting It All Together

The full stack working simultaneously:

1. **MCP server** running → 7 tools available to your AI
2. **Bash hook** active → CLI output auto-compacted
3. **Caveman** loaded → AI responses are 65% shorter

**Result:** Your AI does the same work using 60-80% fewer tokens. No quality loss. Just less noise.

### Quick sanity check

Ask your AI:
> "Fetch https://api.github.com/repos/torvalds/linux and tell me the star count."

With AgentSkin active, the response should use ~180 tokens instead of ~1,500 for the API portion.

---

## 8. Troubleshooting

### "MCP server won't connect"
- Make sure `npx` can reach npm: `npx -y agentskin@latest --version`
- Check your MCP config syntax (trailing commas, correct keys)
- Restart your AI tool after adding the config

### "fetch_optimized_data returns an error"
- Verify the URL is publicly accessible
- Private IPs, cloud metadata endpoints, and `javascript:` URLs are blocked for security
- Large responses time out after 30 seconds

### "reduce doesn't seem to do anything"
- `reduce` needs both `command` AND `output` parameters
- Small outputs already compact won't benefit much
- Try with large build logs or directory listings to see dramatic results

### "Caveman not working"
- Verify `.md` skill files are in the correct directory
- Some agents require a restart to pick up new skills
- Try explicitly: "Load the caveman skill and enable caveman mode"

### Tool not showing up
- AI tools only discover MCP tools at startup — restart the tool
- Check the tool's MCP logs for connection errors
- Verify the npx path is correct with `which npx`

---

## More Info

- [agentskin.dev](https://agentskin.dev) — full documentation
- [GitHub](https://github.com/Shawn5cents/agentskin) — source code and issues
- [FAQ](./docs/FAQ.md) — benchmarks, architecture, common questions
