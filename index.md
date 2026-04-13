---
layout: default
title: Home
---

<div class="hero">
  <h1>Assimilai</h1>
  <p>Copy, don't import &mdash; a code distribution pattern for AI agent ecosystems.</p>
</div>

<div class="star-badge">
  <iframe src="https://ghbtns.com/github-btn.html?user=OriNachum&repo=assimilai&type=star&count=true" frameborder="0" scrolling="0" width="150" height="20" title="GitHub Stars" loading="lazy" referrerpolicy="no-referrer"></iframe>
</div>

<div class="post-content" markdown="1">

## What is Assimilai?

Assimilai is a pattern for sharing code between independent
projects — particularly AI agent backends. Instead of installing
shared libraries as dependencies, you **copy reference
implementations** into your project as organic code. Each consumer
owns its copy and can modify it independently.

```text
packages/reference/       -->  copy  -->  clients/backend-a/
                          -->  copy  -->  clients/backend-b/
                          -->  copy  -->  clients/backend-c/
```

No shared imports. No version pinning. No breakage when one
project evolves.

## Why?

Assimilai is for codebases where consumers are **expected to
diverge**. Traditional packages assume every consumer wants
identical behavior. That assumption fails when:

- **Divergence is the point** — each agent backend wraps a
  different SDK with unique integration points, so shared code
  must bend to fit each consumer's shape
- **Independence prevents breakage** — a change in one backend's
  copy of a module cannot break another, because there are no
  shared imports to propagate through
- **Upgrades happen on each consumer's schedule** — no forced
  dependency bumps, no coordinated releases across backends
- **Monorepo code stays direct** — in a monorepo you already own
  the source; publishing internal packages to a registry just to
  import them back adds ceremony without value

Assimilai trades deduplication for independence. The reference
stays maintained so future consumers start from the best available
version, but once you copy it, it's yours.

## How It Works

1. **Maintain a reference implementation** in a central
   `packages/` directory
2. **Copy** the reference into your target project directory
3. **Adapt** only the files you need to change — leave generic
   components as-is
4. **Own your copy** — modify freely without affecting other
   consumers
5. **Improve the reference** — when you fix something generic,
   update `packages/` so the next consumer benefits

## Organic Placement

Assimilated code doesn't need to preserve the reference's file
structure. Code goes where it naturally belongs in the consumer
project — even inside existing files.

Three placement modes:

| Mode | Description |
| --- | --- |
| **Verbatim** | Copied as a standalone file, unchanged |
| **Adapted** | Copied as a standalone file, then modified |
| **Dissolved** | Merged into an existing consumer file |

A dissolved file has no standalone copy — its functions and classes
were absorbed into a file that already existed in the consumer
project. The assimilated code becomes indistinguishable from the
consumer's own code.

**Example:** The reference has a standalone `config.py` with a
`load_config()` function. In the Claude backend, this function
was absorbed into the existing `clients/claude/settings.py` — no
standalone `config.py` exists. The metadata records (paths
relative to project root):
`"config.py" = { status = "dissolved", into = "clients/claude/settings.py" }`

## Specification

Assimilai metadata tracks what was assimilated, from where, and in
what state. It lives in:

- **Python:** `[tool.assimilai]` in `pyproject.toml`
- **Node.js:** `"assimilai"` key in `package.json`

### Python example

```toml
[tool.assimilai.packages.harness-claude]
source = "../packages/agent-harness"
version = "0.6.0"
target = "culture/clients/claude"
assimilated = "2026-03-24"

[tool.assimilai.packages.harness-claude.files]
"daemon.py" = { status = "adapted" }
"irc_transport.py" = { status = "verbatim", sha256 = "e3b0c44..." }
"config.py" = { status = "dissolved", into = "clients/claude/settings.py" }
```

### Node.js example

```json
{
  "assimilai": {
    "packages": {
      "harness-claude": {
        "source": "../packages/agent-harness",
        "version": "0.6.0",
        "target": "src/clients/claude",
        "assimilated": "2026-03-24",
        "files": {
          "daemon.js": { "status": "adapted" },
          "transport.js": {
            "status": "verbatim",
            "sha256": "e3b0c44..."
          },
          "config.js": {
            "status": "dissolved",
            "into": "src/clients/claude/settings.js"
          }
        }
      }
    }
  }
}
```

### Propagation

When the reference package updates, propagation follows a simple
contract — the answer to "how does this not become a maintenance
nightmare?"

| File status | Action on update |
| --- | --- |
| **Verbatim** | Replace file, update hash |
| **Adapted** | Flag for review, do not overwrite |
| **Dissolved** | Flag for review, do not touch |

Propagation can be performed by an AI coding agent reading the
metadata, or manually.

See the [full specification]({{ '/spec' | relative_url }}) for
complete field reference and real-world examples.

## When Not to Use Assimilai

If your environment requires provenance to a specific published
artifact — compliance, regulated industries, SBOM traceability
back to an exact audited package version — traditional dependencies
remain the right choice. Dissolving code into your own files breaks
that chain of custody by design.

Similarly, if shared code must stay identical across all consumers
(crypto primitives, protocol parsers), Assimilai is the wrong tool.
Use a versioned package with pinned dependencies instead.

## Origin

Assimilai was developed as part of
[Culture](https://github.com/OriNachum/culture), where multiple
AI agent backends (Claude, Codex, and others) need to share
infrastructure code (IRC transport, IPC, socket servers) while
maintaining full independence in their agent-specific integration
layers. Claude's backend dissolved `config.py` into its own
`settings.py`, while Codex kept it verbatim — same reference,
different assimilation strategies.

</div>
