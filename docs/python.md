---
layout: default
title: Python CLI
---

<div class="post-content" markdown="1">

## Python CLI

The `assimilai` Python package tracks assimilated code in
`pyproject.toml` under the `[tool.assimilai]` section.

### Install

```bash
uv tool install assimilai
```

Or with pip:

```bash
pip install assimilai
```

### Commands

#### `assimilai init`

Record an assimilation. Scans files in the target directory
and records each with its sha256 hash.

```bash
assimilai init <name> \
  --source <path-or-url> \
  --version <semver> \
  --target <local-dir>
```

| Flag | Required | Description |
| --- | --- | --- |
| `<name>` | yes | Entry name (e.g. `agent-harness`) |
| `--source` | yes | Path or URL to the reference package |
| `--version` | yes | Semver of the reference at copy time |
| `--target` | yes | Local directory where files were placed |
| `--pyproject` | no | Path to pyproject.toml (default: `pyproject.toml`) |

**What it does:**

1. Reads the existing `pyproject.toml`
2. Scans all files in `--target` (skipping hidden directories)
3. Computes sha256 for each file
4. Records everything as `verbatim` under
   `[tool.assimilai.packages.<name>]`
5. Sets `assimilated` to today's date

#### `assimilai check`

Verify integrity of assimilated files.

```bash
assimilai check [name]
```

| Flag | Required | Description |
| --- | --- | --- |
| `[name]` | no | Check a specific package (omit to check all) |
| `--pyproject` | no | Path to pyproject.toml (default: `pyproject.toml`) |

**What it reports:**

- **OK** — file hash matches the recorded sha256
- **DRIFT** — file was modified (hash mismatch)
- **MISSING** — file was deleted
- **SKIP** — file is `adapted` or `dissolved` (expected to differ)

Exit code 0 if all verbatim files match, 1 if drift detected.

### pyproject.toml schema

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

### File status

After running `init`, all files start as `verbatim`. To mark a
file as adapted or dissolved, edit the `pyproject.toml` directly:

```toml
# Changed this file to fit our backend
"daemon.py" = { status = "adapted" }

# Merged into our existing settings module
"config.py" = { status = "dissolved", into = "src/settings.py" }
```

`assimilai check` will then skip these files.

### Walkthrough

```bash
# 1. Copy reference files into your project
cp -r ../packages/agent-harness/ ./src/clients/claude/

# 2. Record the assimilation
assimilai init harness-claude \
  --source ../packages/agent-harness \
  --version 0.6.0 \
  --target ./src/clients/claude

# 3. Adapt files as needed
# Edit daemon.py, dissolve config.py into settings.py...

# 4. Update pyproject.toml to reflect changes
# Mark adapted/dissolved files manually

# 5. Check integrity of verbatim files
assimilai check harness-claude
```

</div>
