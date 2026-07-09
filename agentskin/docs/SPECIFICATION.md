# Semantic Shorthand Standard (SSS) v1.0 Specification

## Abstract

The Semantic Shorthand Standard (SSS) defines a deterministic algorithm for pruning arbitrary JSON/HTML data into compact, hierarchical Markdown \"skins.\" Designed for agentic workflows, SSS eliminates the Token Tax by retaining only high-signal keys while normalizing schema via aliases.

Reference implementation: [GitHub](https://github.com/shawn5cents/agentskin) | NPM: agentskin@5.0.0

**Suite version:** AgentSkin Suite v5.0.0 (AgentSkin SSS + Tokenjuice CLI + Caveman)

## Tools Schema

### fetch_optimized_data

```json
{
  \"type\": \"object\",
  \"properties\": {
    \"url\": {\"type\": \"string\", \"description\": \"Target URL (HTTP/HTTPS only, SSRF protected)\"},
    \"signals\": {\"type\": \"array\", \"items\": {\"type\": \"string\"}, \"description\": \"High-signal keys to preserve (defaults: ['id','name','title',...'p'] )\"},
    \"aliases\": {\"type\": \"object\", \"additionalProperties\": {\"type\": \"string\"}, \"description\": \"Map original_key -> signal_key\"},
    \"apply_reasoning\": {\"type\": \"boolean\", \"description\": \"Denoise string values with skin_reasoning (defaults: false)\"},
    \"auto_classify\": {\"type\": \"boolean\", \"description\": \"Auto-detect URL rules from 11 built-in families (defaults: true)\"}
  },
  \"required\": [\"url\"]
}
```

### skin_reasoning

```json
{
  \"type\": \"object\",
  \"properties\": {\"text\": {\"type\": \"string\"}},
  \"required\": [\"text\"]
}
```

### classify_url

```json
{
  \"type\": \"object\",
  \"properties\": {\"url\": {\"type\": \"string\"}},
  \"required\": [\"url\"]
}
```

Returns the matched rule family and score, or null if no rule matches.

### strip_ansi

```json
{
  \"type\": \"object\",
  \"properties\": {\"text\": {\"type\": \"string\"}},
  \"required\": [\"text\"]
}
```

Strips 5 patterns of ANSI escape sequences: CSI, OSC, incomplete CSI/OSC, and single-char escapes.

## Core Algorithm: recursive_prune(data, signals, aliases, apply_reasoning)

**Pseudocode:**

```
DEFAULT_SIGNALS = ['id', 'name', 'title', 'value', 'status', 'price', 'temp', 'wind', 'description', 'url', 'link', 'published_at', 'text', 'code', 'c', 'v', 'p']

effective_signals = union(DEFAULT_SIGNALS, signals)

function recursive_prune(data):
  if Array.isArray(data):
    return data.map(recursive_prune).filter(non-null)
  if typeof data === 'object' && data !== null:
    pruned = {}
    for [key, value] of Object.entries(data):
      lower_key = key.toLowerCase()
      target_key = aliases[lower_key] || aliases[key] || key
      if lower_key in effective_signals or target_key.toLowerCase() in effective_signals:
        processed_value = if (typeof value === 'string' and apply_reasoning) skin_reasoning(value) else value
        pruned[target_key] = processed_value
      elif typeof value === 'object':
        sub_pruned = recursive_prune(value)
        if sub_pruned has keys:
          pruned[key] = sub_pruned
    return pruned if pruned has keys else null
  return data
```

## Output Format: to_markdown_skin(pruned, title, raw_size)

```
if raw_size > 500 and title:
  output += `[${title}]\n`

flatten(pruned, output)

function flatten(obj, prefix = ''):
  if Array.isArray(obj):
    for item in obj: flatten(item, prefix)
  elif typeof obj === 'object':
    for [k, v] of Object.entries(obj):
      if typeof v === 'object':
        flatten(v, prefix + k + '.')
      else:
        output += `${prefix}${k}: ${v}\n`
```

**BNF Grammar:**

```
skin ::= '[' title ']' '\n' lines | lines
lines ::= line '\n' lines | line '\n'?
line ::= prefix? key ': ' value
prefix ::= identifier '.'
key ::= identifier
value ::= string | number | boolean | array
identifier ::= [a-zA-Z0-9_]+
```

## Guarantees

1. **Signal Completeness**: Every key matching signals or aliases is preserved, recursively.
2. **Determinism**: Identical input + params produce identical output.
3. **No Data Loss for Signals**: Pruning never omits requested signals.
4. **No Hallucination**: Output contains only transformed input data.
5. **Compression Safety**: If skin tokens >= raw, fallback to raw (future).

## Security (v5.0)
The reference implementation includes security measures to protect against common attack vectors:

### SSRF Protection
- **Private IPv4 Ranges Blocked:** 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x, 0.0.0.0
- **IPv6 Blocked:** ::1 (loopback), :: (unspecified), fe80: (link-local), fc00: (unique local)
- **IPv4-Mapped Blocked:** ::ffff:127.0.0.1 etc.
- **Cloud Metadata Blocked:** metadata.google.internal, metadata.azure.com, kubernetes.default.svc
- **Protocol Enforcement:** Only http: and https: allowed

### Rate Limiting
- **AgentSkin MCP:** 30 requests/minute sliding window per server instance
- **Tokenjuice MCP:** 60 requests/minute sliding window per server instance
- Prevents resource exhaustion from rapid fire tool calls

### Processing Limits
- **30s timeout** on all processing operations
- **5MB response** hard cap
- **2MB HTML** parsing cap

## Edge Cases

| Input | Expected Behavior |
|-------|-------------------|
| `{}` | null (skipped) |
| `null` | null |
| `"string"` | "string" (if signal) |
| Deep nest without signals | null |
| Array of nulls | [] |
| HTML parsed | Structured JSON -> pruned |

## Benchmarks

| Endpoint | Raw | Skin | Savings |
|----------|-----|------|----------|
| GitHub API | 1,544 tok | 180 tok | **88.3%** |
| Weather API | 163 tok | 55 tok | **66.3%** |
| CLI `ls -laR` | 3.19M chars | 897 chars | **99.97%** |
| Agent replies (Caveman) | 1,214 tok avg | 294 tok avg | **65%** |

Combined test suite: **4,695 tests**, 274 files — 100% passing.

## Credits

| Creator | Contribution |
|---------|-------------|
| **Shawn Nichols Sr.** (Nichols Transco LLC) | AgentSkin SSS protocol, MCP server, Suite |
| **Vincent Koc** | Tokenjuice (MIT License) |
| **Julius Brussee** | Caveman ([github.com/JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)) |

© 2026 Nichols Transco LLC