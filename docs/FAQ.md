# AgentSkin FAQ (Backed by Benchmarks)

## How do I know this won't delete important data?

SSS uses explicit whitelist (signals). Deterministic code guarantees completeness for requested keys. Tests verify.

## Modern LLMs have 2M+ context. Why prune?

Perceptual drag: attention wasted on noise. Benchmarks: Weather API 163 → 55 GPT-4 tokens (66% savings). Reasoning accuracy improves as model focuses on signals.

## Specific improvements?

**Benchmarked (GPT-4 cl100k_base):**
- Weather API: 66.3% token savings
- Cost drop proportional to tokens.
- TTFT scales with input size; smaller = faster.

## Why local server?

Self-sovereign: data never leaves host. Zero-latency pruning.

Run `npm run benchmark` for local reproduction.