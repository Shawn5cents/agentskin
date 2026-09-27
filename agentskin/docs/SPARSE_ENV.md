# Sparse Env Integration

Date: 2026-09-26

## Status

**ACCEPTED for the frozen AgentSkin 5.1 offline core pruning/text workload.**

Canonical commits:

- AgentSkin: `66e5ddbaf9c730368ff54a98da92b791fa18d065`
- Sparse Env: `407cf879cddd17ba9c610907817d6753edf35be4`

This integration is for deterministic local core evaluation. It does not change AgentSkin's MCP/runtime semantics or claim acceleration for live external API fetching.

## Ownership boundary

AgentSkin owns:

- the frozen core correctness workload;
- expected stdout SHA-256;
- the thin Sparse Env consumer.

Sparse Env owns:

- environment catalog;
- cold/warm environment selection;
- snapshotter/runtime policy;
- lifecycle;
- stats;
- teardown verification.

AgentSkin must not hardcode a snapshotter or duplicate Sparse Env policy.

## Consumer flow

```text
AgentSkin core evaluation
        |
        v
sparse-env select
 workload=agentskin__core-v51
 cache_state=cold|warm
        |
        v
create -> run -> stats -> destroy
        |
        v
exact stdout SHA verification
```

Consumer:

`scripts/run-sparse-env-eval.mjs`

Frozen contract:

`benchmarks/sparse-env-contract.json`

Frozen workload:

`scripts/sparse-env-core-eval.mjs`

## Correctness

Expected stdout SHA-256:

`a50f2c71c04f0a49f1ae9b3986820f6a29dfb1d6d6f5735e3d3c759968412dd2`

Preserved across:

- normal host execution;
- network-disabled canonical image;
- Sparse Env overlayfs;
- Sparse Env Stargz;
- final cold consumer run;
- final warm consumer run.

The frozen workload verifies:

- GitHub URL rule resolves to `github/repos`;
- authoritative compaction is preserved;
- unrelated nested generic keys do not leak;
- explicit signals exclude secrets;
- default fallback remains exact;
- ANSI stripping remains exact;
- grapheme counting remains exact.

## Measured execution policy

Five accepted cold runs per arm:

| Metric | overlayfs | Stargz |
|---|---:|---:|
| median cold total | 6,207 ms | 3,214 ms |
| median fresh-store growth | 352,755,023 B | 141,023,659 B |

Derived:

- cold total improvement: **48.22%**
- fresh-store reduction: **60.02%**

Five accepted warm/existing-cache runs per arm:

| Metric | overlayfs | Stargz |
|---|---:|---:|
| median elapsed | 739 ms | 740 ms |
| observed range | 719-1,207 ms | 735-764 ms |

The warm median differs by only **1 ms**, less than both within-arm ranges. It is therefore an operational tie, not a Stargz win or regression.

Sparse Env selects:

- cold/ephemeral -> Stargz
- warm/existing-cache -> overlayfs

That policy remains in Sparse Env.

## Usage

Cold:

```bash
node scripts/run-sparse-env-eval.mjs \
  --sparse-env /data/repos/sparse-env/bin/sparse-env \
  --cache-state cold
```

Warm:

```bash
node scripts/run-sparse-env-eval.mjs \
  --sparse-env /data/repos/sparse-env/bin/sparse-env \
  --cache-state warm
```

An accepted run must preserve the exact frozen output hash, return stats, destroy the environment, and reject post-destroy status.

## Scope limitation

This acceptance is limited to deterministic offline AgentSkin core behavior. It does not approve:

- live MCP transport execution through Sparse Env;
- external HTTP/API fetching;
- public-service behavior;
- the complete npm release pipeline;
- every future AgentSkin benchmark/workload.

New workload classes remain separately evidence-gated.
