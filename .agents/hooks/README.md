# AgentSkin Bash Hook

Optional shell helper for compacting noisy command output before an AI agent consumes it.

## Install

```bash
.agents/hooks/install.sh
source ~/.bashrc
```

## Use

```bash
opt git status
opt npm test
```

The hook captures command output and passes it to `agent-optimizer.mjs`, which uses the same Tokenjuice npm dependency as the AgentSkin MCP `reduce` tool. Full compact results are cached under `${TOKENJUICE_CACHE:-~/.cache/tokenjuice}`.

## Controls

- `TOKENJUICE_HOOK=on|off` - global toggle
- `TOKENJUICE_OPT=auto|always|off` - optimization mode
- `TOKENJUICE_MIN_RAW=4096` - minimum bytes in auto mode
- `TOKENJUICE_MAX_RAW=10485760` - raw capture cap
- `TOKENJUICE_HOOK_ALIAS=0|1` - optional command aliases; off by default
- `NO_OPTIMIZE=1` - bypass one command

Savings vary by command and output shape. Validate that required facts survive before treating a reduction as successful.
