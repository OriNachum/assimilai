---
layout: default
title: When Not to Use Assimilai
---

<div class="post-content" markdown="1">

## When Not to Use Assimilai

Assimilai is designed for a specific situation: multiple consumers
that share infrastructure code but need to diverge independently.
Outside that situation, traditional approaches are often better.

### Compliance and provenance requirements

If your environment requires traceability to a specific published
artifact — compliance audits, regulated industries, SBOM
requirements that trace back to an exact audited package version —
traditional dependencies remain the right choice.

Dissolving code into your own files breaks the chain of custody
by design. There is no published artifact to point to, no version
to audit against. The code becomes yours, indistinguishable from
code you wrote yourself.

### Code that must stay identical

If shared code **must** remain identical across all consumers —
crypto primitives, protocol parsers, security-critical validation
logic — Assimilai is the wrong tool. The entire point of the
pattern is that consumers can modify their copies. Use a versioned
package with pinned dependencies instead.

### Few consumers, low divergence

If you have two or three consumers that mostly use the shared code
as-is with minimal adaptation, the overhead of tracking assimilai
metadata may not be worth it. A shared internal package with
well-defined extension points might serve you better.

Assimilai's value scales with divergence. If consumers barely
diverge, the pattern adds complexity without adding freedom.

### When vendoring is sufficient

If you want to copy code but don't need organic placement
(dissolved files) or metadata tracking, plain vendoring works
fine. Copy the files into a `vendor/` directory, leave them
untouched, and update manually when needed.

Assimilai adds value over vendoring when you need to:

- Track which files were modified vs. kept as-is
- Dissolve code into existing files
- Detect drift in verbatim files
- Inform future updates with provenance metadata

### Summary

| Situation | Use |
| --- | --- |
| Consumers expected to diverge | Assimilai |
| Monorepo, skip the publish step | Assimilai |
| Compliance/provenance required | Traditional packages |
| Code must stay identical | Pinned dependencies |
| Few consumers, low divergence | Shared internal package |
| Copy but don't modify | Plain vendoring |

</div>
