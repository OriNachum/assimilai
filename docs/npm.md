---
layout: default
title: npm CLI
---

<div class="post-content" markdown="1">

## npm CLI

The `assimilai` npm package tracks assimilated code in
`package.json` under the `"assimilai"` key.

### Install

```bash
npm install -g assimilai
```

Or as a dev dependency:

```bash
npm install --save-dev assimilai
```

Or run without installing:

```bash
npx assimilai --help
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
| `--package-json` | no | Path to package.json (default: `package.json`) |

**What it does:**

1. Reads the existing `package.json`
2. Scans all files in `--target` (skipping hidden directories)
3. Computes sha256 for each file
4. Records everything as `verbatim` under
   `assimilai.packages.<name>`
5. Sets `assimilated` to today's date

#### `assimilai check`

Verify integrity of assimilated files.

```bash
assimilai check [name]
```

| Flag | Required | Description |
| --- | --- | --- |
| `[name]` | no | Check a specific package (omit to check all) |
| `--package-json` | no | Path to package.json (default: `package.json`) |

**What it reports:**

- **OK** — file hash matches the recorded sha256
- **DRIFT** — file was modified (hash mismatch)
- **MISSING** — file was deleted
- **SKIP** — file is `adapted` or `dissolved` (expected to differ)

Exit code 0 if all verbatim files match; non-zero if any drift
or missing files are detected, or if a requested package name
is not found.

### package.json schema

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

### File status

After running `init`, all files start as `verbatim`. To mark a
file as adapted or dissolved, edit `package.json` directly:

```json
{
  "daemon.js": { "status": "adapted" },
  "config.js": {
    "status": "dissolved",
    "into": "src/settings.js"
  }
}
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
# Edit daemon.js, dissolve config.js into settings.js...

# 4. Update package.json to reflect changes
# Mark adapted/dissolved files manually

# 5. Check integrity of verbatim files
assimilai check harness-claude
```

</div>
