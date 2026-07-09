---
activation: always_on
description: tokenjuice terminal output compaction
---

<!-- tokenjuice:antigravity-rule -->

# tokenjuice terminal output compaction

- When running terminal commands through Google Antigravity IDE or CLI (`agy`), prefer `tokenjuice wrap -- <command>` for commands likely to produce long output.
- Treat compacted tokenjuice output as authoritative unless it explicitly says raw output is required.
- If raw bytes are required, rerun the command with exactly `tokenjuice wrap --raw -- <command>`.
- Do not suggest both raw and full reruns; use the raw escape hatch.
