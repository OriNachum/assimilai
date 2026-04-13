---
status: superseded
superseded_by: citation-cli-v1.md
---

> **Superseded.** This document describes the legacy Assimilai v1
> schema. The project has been renamed to **citation-cli** and the
> schema revised. See
> [citation-cli-v1.md](./citation-cli-v1.md) for the current spec,
> and run `cite migrate` to convert existing manifests.

# Assimilai Specification v1

Version: 1.0.0
Date: 2026-03-24

## Overview

Assimilai is a code distribution pattern where reference
implementations are **copied into consumer projects as organic
code** rather than imported as dependencies. This specification
defines the metadata schema that tracks what was assimilated,
from where, and in what state.

## Design Principles

1. **Copy, don't import** — no shared runtime dependencies
   between consumers
2. **Own your copy** — each consumer can modify assimilated
   code freely
3. **Organic placement** — code goes where it naturally belongs
   in the consumer, not where it lived in the reference
4. **Trackable provenance** — metadata records what came from
   where, enabling drift detection and informed updates

## Schema

### Python (`pyproject.toml`)

Assimilai metadata lives under `[tool.assimilai]` following
[PEP 518](https://peps.python.org/pep-0518/) conventions for
tool-specific configuration.

```toml
[tool.assimilai.packages.<entry-name>]
source = "<path-or-url>"
version = "<semver>"
target = "<local-path>"
assimilated = "<YYYY-MM-DD>"

[tool.assimilai.packages.<entry-name>.files]
"<filename>" = { status = "verbatim", sha256 = "<hash>" }
"<filename>" = { status = "adapted" }
"<filename>" = { status = "dissolved", into = "<consumer-file>" }
```

### Node.js (`package.json`)

Assimilai metadata lives under the `"assimilai"` top-level key.

```json
{
  "assimilai": {
    "packages": {
      "<entry-name>": {
        "source": "<path-or-url>",
        "version": "<semver>",
        "target": "<local-path>",
        "assimilated": "<YYYY-MM-DD>",
        "files": {
          "<filename>": {
            "status": "verbatim",
            "sha256": "<hash>"
          },
          "<filename>": {
            "status": "adapted"
          },
          "<filename>": {
            "status": "dissolved",
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
| ------- | ------ | ---------- | ------------- |
| `source` | string | yes | Path or URL to the reference |
| `version` | string | yes | Semver of the reference at copy time |
| `target` | string | yes | Local directory where files were placed |
| `assimilated` | string | yes | ISO date (YYYY-MM-DD) of assimilation |

**`source`** can be:

- A relative path: `"../packages/agent-harness"`
- An absolute path: `"/home/user/refs/agent-harness"`
- A git URL: `"https://github.com/org/repo/tree/main/packages/x"`

**`entry-name`** is a user-chosen identifier for this assimilation.
When the same reference is assimilated into multiple targets,
use distinct entry names (e.g., `agent-harness-claude`,
`agent-harness-codex`).

### File-level fields

| Field | Type | Required | Description |
| ------- | ------ | ---------- | ------------- |
| `status` | string | yes | One of: `verbatim`, `adapted`, `dissolved` |
| `sha256` | string | verbatim only | Hash of the file at copy time |
| `into` | string | dissolved only | Consumer file where code was merged |

## File Status

### `verbatim`

The file was copied without modification. The `sha256` field
records the hash at copy time, enabling integrity checks — if
the local file's hash differs from the recorded hash, it was
modified unexpectedly.

### `adapted`

The file was copied and then intentionally modified to fit
the consumer's needs. No hash is recorded because divergence
is expected.

### `dissolved`

The file's contents were extracted and merged into an existing
consumer file. There is no standalone copy of the reference
file in the consumer project. The `into` field records which
consumer file absorbed the code.

This is the most "organic" placement mode — the assimilated
code becomes indistinguishable from the consumer's own code.

## Propagation

When the reference package is updated, consumers can propagate
changes using these rules:

| File status | Action on update |
| ------------- | ----------------- |
| `verbatim` | Replace file, update `sha256`, `version`, `assimilated` |
| `adapted` | **Do not overwrite.** Flag that reference changed for review |
| `dissolved` | **Do not touch.** Flag that reference changed for review |

Additional rules:

- **New files in reference:** Add as `verbatim` to the consumer
- **Deleted files in reference:** Flag for manual review — do not
  auto-delete

Propagation can be performed by an AI coding agent reading the
`[tool.assimilai]` metadata, or by a CLI tool (future work).

## Example

A monorepo with a reference package assimilated into two backends:

```toml
# pyproject.toml

[tool.assimilai.packages.harness-claude]
source = "../packages/agent-harness"
version = "0.6.0"
target = "culture/clients/claude"
assimilated = "2026-03-24"

[tool.assimilai.packages.harness-claude.files]
"daemon.py" = { status = "adapted" }
"agent_runner.py" = { status = "adapted" }
"supervisor.py" = { status = "adapted" }
"irc_transport.py" = { status = "verbatim", sha256 = "e3b0c44..." }
"message_buffer.py" = { status = "verbatim", sha256 = "a7ffc6f..." }
"socket_server.py" = { status = "verbatim", sha256 = "2c26b46..." }
"ipc.py" = { status = "verbatim", sha256 = "fcde2b2..." }
"webhook.py" = { status = "verbatim", sha256 = "d7a8fbb..." }
"config.py" = {
  status = "dissolved",
  into = "culture/clients/claude/settings.py",
}

[tool.assimilai.packages.harness-codex]
source = "../packages/agent-harness"
version = "0.6.0"
target = "culture/clients/codex"
assimilated = "2026-03-24"

[tool.assimilai.packages.harness-codex.files]
"daemon.py" = { status = "adapted" }
"agent_runner.py" = { status = "adapted" }
"supervisor.py" = { status = "adapted" }
"irc_transport.py" = { status = "verbatim", sha256 = "e3b0c44..." }
"message_buffer.py" = { status = "verbatim", sha256 = "a7ffc6f..." }
"socket_server.py" = { status = "verbatim", sha256 = "2c26b46..." }
"ipc.py" = { status = "verbatim", sha256 = "fcde2b2..." }
"webhook.py" = { status = "verbatim", sha256 = "d7a8fbb..." }
"config.py" = { status = "verbatim", sha256 = "b5bb9d8..." }
```

Note how the same reference package is assimilated differently:
Claude's backend dissolved `config.py` into its own `settings.py`,
while Codex kept it verbatim.

## For AI Coding Agents

When you encounter `[tool.assimilai]` in a `pyproject.toml` or
`"assimilai"` in a `package.json`:

1. **Read it** to understand which files originated from a
   reference and which were modified
2. **Check verbatim files** — hash should match; if not, the
   file was changed outside the assimilai workflow
3. **Respect adapted/dissolved files** — these are owned by the
   consumer and should not be overwritten during propagation
4. **When assimilating new code**, update the metadata to reflect
   what was copied and how it was placed
