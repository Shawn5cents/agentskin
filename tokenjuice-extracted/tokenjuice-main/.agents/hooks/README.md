# Tokenjuice Bash Hook (Phase 3c)

Transparent terminal hook that pipes noisy command output through the
Tokenjuice reduce pipeline before it reaches your terminal (or your agent).

## What it does

Wraps a command, captures its `stdout`/`stderr`/exit code, and:

1. Sends the result as a `ToolExecutionInput` JSON payload to
   `scripts/agent-optimizer.mjs`.
2. The optimizer runs `reduceExecution()` from the compiled Tokenjuice
   package and returns a `CompactResult` (with `inlineText`, `previewText`,
   `facts`, `stats`, `classification`).
3. The hook prints the compact `inlineText` to the user/agent and writes
   the full result to `${TOKENJUICE_CACHE:-~/.cache/tokenjuice}/<id>.json`
   for later retrieval.

## Install

```bash
# From the tokenjuice repo root:
.agents/hooks/install.sh

# Verify:
source ~/.bashrc
tokenjuice-hook-status
```

## Use

```bash
# Optimize any command (explicit):
opt git status
optimize npm test

# Disable per-command:
NO_OPTIMIZE=1 git status

# Disable globally:
TOKENJUICE_HOOK=off

# Force optimization regardless of size:
TOKENJUICE_OPT=always opt ls
```

By default the hook also aliases common noisy CLIs (`git`, `npm`, `pnpm`,
`yarn`, `docker`, `kubectl`, `curl`, `gh`) so they're optimized transparently.
Set `TOKENJUICE_HOOK_ALIAS=0` to disable aliasing.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `TOKENJUICE_HOOK` | `on` | `on`/`off` — global kill switch |
| `TOKENJUICE_OPT` | `auto` | `auto`/`always`/`off` — optimization mode |
| `TOKENJUICE_MIN_RAW` | `4096` | In `auto` mode, only optimize if raw output ≥ N bytes |
| `TOKENJUICE_CACHE` | `~/.cache/tokenjuice` | Where full compact results are stored |
| `TOKENJUICE_BIN` | auto | Override path to `agent-optimizer.mjs` |
| `TOKENJUICE_TOOL` | `Bash` | `toolName` field in ToolExecutionInput |
| `TOKENJUICE_HOOK_ALIAS` | `0` | `1` to enable command aliasing (default off — see safety note) |
| `TOKENJUICE_MAX_RAW` | `10485760` | Cap on raw capture size (10 MiB) to avoid OOM |
| `NO_OPTIMIZE` | `0` | `1` to skip optimization for a single command |

## MOA integration

When a MOA agent runs a `Bash` tool call, the underlying shell can have the
hook sourced. The agent's tool result is automatically the compact form,
saving context for the LLM that reads the result. The full optimized result
remains accessible via:

```bash
ls ~/.cache/tokenjuice/
cat ~/.cache/tokenjuice/<id>.json | jq .
```

This pairs with the Composio tool `.agents/composio/tokenjuice.json` for
programmatic optimization (same `reduceExecution` pipeline, no shell).

## Files

- `bash-optimizer.sh` — the bash hook (source this)
- `agent-optimizer.mjs` — Node.js shim (in `scripts/`)
- `install.sh` — adds source line to `~/.bashrc`
- `uninstall.sh` — removes source line from `~/.bashrc`
