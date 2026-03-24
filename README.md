# Assimilai

**Copy, don't import.** A code distribution pattern for AI agent ecosystems.

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

No shared imports. No version pinning. No breakage when one project evolves.

## Why?

Traditional package management assumes consumers want identical
behavior from a shared dependency. That breaks down when:

- **Each consumer needs to diverge** — agent backends wrap
  different SDKs and CLIs, each with unique integration points
- **Shared imports create coupling** — a change in one backend's
  copy of a module shouldn't break another backend
- **Dependency updates are forced on everyone** — with Assimilai,
  each project upgrades on its own schedule by pulling from the
  latest reference

Assimilai trades deduplication for independence. The reference
stays maintained so future consumers start from the best available
version, but once you copy it, it's yours.

## How It Works

1. **Maintain a reference implementation** in a central `packages/` directory
2. **Copy** the reference into your target project directory
3. **Adapt** only the files you need to change — leave generic components as-is
4. **Own your copy** — modify freely without affecting other consumers
5. **Improve the reference** — when you fix something generic,
   update `packages/` so the next consumer benefits

## Organic Placement

Assimilated code doesn't need to preserve the reference's file
structure. Code goes where it naturally belongs in the consumer
project — even inside existing files.

Three placement modes:

| Mode | Description |
| ------ | ------------- |
| **Verbatim** | Copied as a standalone file, unchanged |
| **Adapted** | Copied as a standalone file, then modified |
| **Dissolved** | Merged into an existing consumer file |

A dissolved file has no standalone copy — its functions and
classes were absorbed into a file that already existed in the
consumer project. The assimilated code becomes indistinguishable
from the consumer's own code.

## Specification

Assimilai metadata tracks what was assimilated, from where,
and in what state. It lives in:

- **Python:** `[tool.assimilai]` in `pyproject.toml`
- **Node.js:** `"assimilai"` key in `package.json`

### Python example

```toml
[tool.assimilai.packages.harness-claude]
source = "../packages/agent-harness"
version = "0.6.0"
target = "agentirc/clients/claude"
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

When the reference updates:

- **Verbatim** files are replaced, hash updated
- **Adapted** files are flagged for review, not overwritten
- **Dissolved** files are flagged for review, not touched

See [spec/assimilai-v1.md](spec/assimilai-v1.md) for the full
specification.

## Origin

Assimilai was developed as part of
[AgentIRC](https://github.com/orinachum/agentirc), where multiple
AI agent backends (Claude, Codex, and others) need to share
infrastructure code (IRC transport, IPC, socket servers) while
maintaining full independence in their agent-specific integration
layers.

## License

MIT
