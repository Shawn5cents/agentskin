# Security Policy

## Supported Versions

security fixes are applied to the latest released version.

| Version | Supported |
| --- | --- |
| latest | yes |
| older releases | no |

## Reporting a Vulnerability

please use GitHub's private vulnerability reporting flow for this repository:

- go to the `Security` tab in `vincentkoc/tokenjuice`
- choose `Report a vulnerability`

please do not open a public issue for an unpatched vulnerability.

when reporting, include:

- affected version
- install method (`npm`, `brew`, `.deb`, `.rpm`, source)
- impact and attack scenario
- clear reproduction steps or a minimal proof of concept
- any relevant logs or environment details

you should get an acknowledgment once the report is reviewed. fixes will generally land in the latest supported release first.

## Trust Model

tokenjuice is designed to compact and optionally store terminal output. it does not sandbox commands, inspect network traffic, or prevent a wrapped command from doing dangerous things on its own.

current safety boundaries:

- `wrap` executes the command you pass; it does not rewrite shell semantics or add shell interpolation
- raw output storage is opt-in
- stored artifacts use validated ids and private file modes on unix-like systems
- direct input and child output paths have size limits to reduce memory abuse
- malformed override rules and corrupted artifact metadata are ignored instead of being trusted

## Current Non-Goals

these are intentionally out of scope today:

- secret redaction or content rewriting
- command sandboxing
- policy enforcement over what users are allowed to run
- protection against a malicious local user who already controls the configured artifact or rule directories
