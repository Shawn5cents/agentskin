# Semantic Shorthand Standard (SSS) v1.0 Specification

## Abstract

The Semantic Shorthand Standard (SSS) defines a deterministic algorithm for pruning arbitrary JSON/HTML data into compact, hierarchical Markdown \"skins.\" Designed for agentic workflows, SSS eliminates the Token Tax by retaining only high-signal keys while normalizing schema via aliases.

Reference implementation: [GitHub](https://github.com/...) | NPM: agentskin@4.2.1

## Tools Schema

### fetch_optimized_data

```json
{
  \"type\": \"object\",
  \"properties\": {
    \"url\": {\"type\": \"string\", \"description\": \"Target URL (HTTP/HTTPS only, SSRF protected)\"},
    \"signals\": {\"type\": \"array\", \"items\": {\"type\": \"string\"}, \"description\": \"High-signal keys to preserve (defaults: ['id','name','title',...'p'] )\"},
    \"aliases\": {\"type\": \"object\", \"additionalProperties\": {\"type\": \"string\"}, \"description\": \"Map original_key -> signal_key\"},
    \"apply_reasoning\": {\"type\": \"boolean\", \"description\": \"Denoise string values with skin_reasoning (defaults: false)\"}
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

Weather API example (GPT-4 cl100k_base):
- Raw: 163 tokens
- Skin: 55 tokens
- Savings: 66.3%

© 2026 Nichols Transco LLC