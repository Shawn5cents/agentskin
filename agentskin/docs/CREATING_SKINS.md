# Creating AgentSkin rules

Rules identify a source and define the fields that should survive semantic pruning. Treat a rule's signals as authoritative; do not rely on generic fallback keys for a known API shape.

Test new rules with representative payloads plus adversarial nested objects that reuse common names such as `id`, `name`, and `url`. A rule is acceptable only when required facts survive and unrelated nested data does not leak into the result.
