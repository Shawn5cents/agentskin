# AgentSkin benchmarks

AgentSkin does not claim one universal compression percentage. Savings depend on payload shape, selected signals, and the command or API being reduced.

## Release benchmark policy

1. Measure the unmodified input.
2. Run the same input through AgentSkin.
3. Verify required facts survive.
4. Report reduction only after fidelity checks pass.
5. Keep benchmark fixtures and commands reproducible.

The AgentSkin test suite currently prints measured examples for live/test HTTP payloads. Run:

```bash
cd agentskin
npm test
```

The primary success criterion is preservation of task-relevant information. Token reduction is secondary.
