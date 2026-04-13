---
title: Specification
nav_order: 6
permalink: /spec/
---

# Citation CLI Specification v1

Version: 1.0.0
Schema version: 2
Date: 2026-04-13

## Overview

Citation CLI is a code distribution pattern where reference
implementations are **cited into consumer projects as organic
code** rather than imported as dependencies. This specification
defines the metadata schema that tracks which code was cited,
from where, and at what level of engagement — **Quote**,
**Paraphrase**, or **Synthesize**.

The citation metaphor is literal. In any academic or intellectual
discipline, there are exactly three ways to use a source:

- **Quote** — take it as-is. You are citing the text verbatim
  because you need exactly what it is.
- **Paraphrase** — rewrite it in your terms. The logic stays but
  you have adapted it to fit your codebase, your language, your
  style.
- **Synthesize** — absorb it into your own work. The idea informed
  your thinking, but the code is yours now. The boundary is gone.

Each level implies deeper introspection, which is exactly what
the pattern encodes.

## Design Principles

1. **Cite, don't import** — no shared runtime dependencies
   between consumers.
2. **Own your copy** — each consumer can modify cited code freely.
3. **Organic placement** — code goes where it naturally belongs
   in the consumer, not where it lived in the reference.
4. **Trackable provenance** — metadata records what came from
   where, enabling drift detection and informed updates.

## Schema

### Python (`pyproject.toml`)

Citation metadata lives under `[tool.citation]` following
[PEP 518](https://peps.python.org/pep-0518/) conventions for
tool-specific configuration.

```toml
[tool.citation.packages.<entry-name>]
schema = 2
source = "<path-or-url>"
version = "<semver>"
target = "<local-path>"
cited = "<YYYY-MM-DD>"

[tool.citation.packages.<entry-name>.files]
"<filename>" = { status = "quote", sha256 = "<hash>" }
"<filename>" = { status = "paraphrase" }
"<filename>" = { status = "synthesize", into = "<consumer-file>" }
```

### Node.js (`package.json`)

Citation metadata lives under the `"citation"` top-level key.

```json
{
  "citation": {
    "packages": {
      "<entry-name>": {
        "schema": 2,
        "source": "<path-or-url>",
        "version": "<semver>",
        "target": "<local-path>",
        "cited": "<YYYY-MM-DD>",
        "files": {
          "<filename>": {
            "status": "quote",
            "sha256": "<hash>"
          },
          "<filename>": {
            "status": "paraphrase"
          },
          "<filename>": {
            "status": "synthesize",
            "into": "<consumer-file>"
          }
        }
      }
    }
  }
}
```

## Field Reference

### Package-level fields

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `schema` | integer | yes | Schema version (currently `2`) |
| `source` | string | yes | Path or URL to the reference |
| `version` | string | yes | Semver of the reference at citation time |
| `target` | string | yes | Local directory where files were placed |
| `cited` | string | yes | ISO date (YYYY-MM-DD) of citation |

**`source`** can be:

- A relative path: `"../packages/agent-harness"`
- An absolute path: `"/home/user/refs/agent-harness"`
- A git URL: `"https://github.com/org/repo/tree/main/packages/x"`

**`entry-name`** is a user-chosen identifier for this citation.
When the same reference is cited into multiple targets, use
distinct entry names (e.g., `agent-harness-claude`,
`agent-harness-codex`).

### File-level fields

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `status` | string | yes | One of: `quote`, `paraphrase`, `synthesize` |
| `sha256` | string | `quote` only | Hash of the file at citation time |
| `into` | string | `synthesize` only | Consumer file where code was absorbed |

## File Status

### `quote`

The file was copied without modification — a verbatim citation.
The `sha256` field records the hash at citation time, enabling
integrity checks: if the local file's hash differs from the
recorded hash, it was modified outside the citation workflow.

A quote is a conscious choice. You are saying: *this code, exactly
as it is, is what I need.*

### `paraphrase`

The file was copied and then intentionally rewritten in the
consumer's terms. The logic stays, but the code has been adapted
to fit the consumer's style, idioms, or surrounding architecture.
No hash is recorded because divergence is the point.

A paraphrase means you understood the source well enough to restate
it.

### `synthesize`

The file's contents were absorbed into an existing consumer file.
There is no standalone copy of the reference file in the consumer
project. The `into` field records which consumer file absorbed the
code.

This is the most "organic" placement mode — the cited code becomes
indistinguishable from the consumer's own code. A synthesis means
you internalized the source completely.

## Propagation

When the reference package is updated, consumers can propagate
changes using these rules:

| File status | Action on update |
| ----------- | ---------------- |
| `quote` | Replace file, update `sha256`, `version`, `cited` |
| `paraphrase` | **Do not overwrite.** Flag for review |
| `synthesize` | **Do not touch.** Flag for review |

Additional rules:

- **New files in reference:** Add as `quote` to the consumer.
- **Deleted files in reference:** Flag for manual review — do not
  auto-delete.

Propagation can be performed by an AI coding agent reading the
`[tool.citation]` metadata, or by the forthcoming `cite sync`
command.

## Example

A monorepo with a reference package cited into two backends:

```toml
# pyproject.toml

[tool.citation.packages.harness-claude]
schema = 2
source = "../packages/agent-harness"
version = "0.6.0"
target = "culture/clients/claude"
cited = "2026-04-13"

[tool.citation.packages.harness-claude.files]
"daemon.py" = { status = "paraphrase" }
"agent_runner.py" = { status = "paraphrase" }
"supervisor.py" = { status = "paraphrase" }
"irc_transport.py" = { status = "quote", sha256 = "e3b0c44..." }
"message_buffer.py" = { status = "quote", sha256 = "a7ffc6f..." }
"socket_server.py" = { status = "quote", sha256 = "2c26b46..." }
"ipc.py" = { status = "quote", sha256 = "fcde2b2..." }
"webhook.py" = { status = "quote", sha256 = "d7a8fbb..." }
"config.py" = {
  status = "synthesize",
  into = "culture/clients/claude/settings.py",
}

[tool.citation.packages.harness-codex]
schema = 2
source = "../packages/agent-harness"
version = "0.6.0"
target = "culture/clients/codex"
cited = "2026-04-13"

[tool.citation.packages.harness-codex.files]
"daemon.py" = { status = "paraphrase" }
"agent_runner.py" = { status = "paraphrase" }
"supervisor.py" = { status = "paraphrase" }
"irc_transport.py" = { status = "quote", sha256 = "e3b0c44..." }
"message_buffer.py" = { status = "quote", sha256 = "a7ffc6f..." }
"socket_server.py" = { status = "quote", sha256 = "2c26b46..." }
"ipc.py" = { status = "quote", sha256 = "fcde2b2..." }
"webhook.py" = { status = "quote", sha256 = "d7a8fbb..." }
"config.py" = { status = "quote", sha256 = "b5bb9d8..." }
```

Note how the same reference package is cited differently: Claude's
backend synthesized `config.py` into its own `settings.py`, while
Codex kept it as a quote.

## For AI Coding Agents

When you encounter `[tool.citation]` in a `pyproject.toml` or
`"citation"` in a `package.json`:

1. **Read it** to understand which files originated from a
   reference and at what level they are engaged.
2. **Check quotes** — hash should match; if not, the file was
   changed outside the citation workflow.
3. **Respect paraphrases and syntheses** — these are owned by the
   consumer and should not be overwritten during propagation.
4. **When citing new code**, update the metadata to reflect what
   was copied and how it was placed.

## Migration from Assimilai v1

Citation CLI supersedes the earlier **Assimilai** project. The
schema and vocabulary map one-to-one:

| Assimilai v1 | Citation CLI v1 |
| ------------ | --------------- |
| `[tool.assimilai]` | `[tool.citation]` |
| `"assimilai"` (package.json) | `"citation"` (package.json) |
| `assimilated` field | `cited` field |
| status `verbatim` | status `quote` |
| status `adapted` | status `paraphrase` |
| status `dissolved` | status `synthesize` |
| (no `schema` field) | `schema = 2` |

To migrate an existing manifest, run:

```bash
cite migrate          # rewrite pyproject.toml or package.json in place
cite migrate --dry-run   # preview the translation
```

The migrator refuses to run if a `[tool.citation]` block already
exists, and errors on any unknown file status.
