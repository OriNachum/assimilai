# citation-cli

Cite, don't import — track cited code in `pyproject.toml` with
**Quote / Paraphrase / Synthesize** semantics.

## Install

```bash
uv tool install citation-cli
```

Or with pip:

```bash
pip install citation-cli
```

## Usage

Record a citation — scans files in the target directory and records
each as a quote with its sha256 hash in `pyproject.toml`:

```bash
cite add my-pkg \
  --source ../packages/ref \
  --version 1.0.0 \
  --target ./src/clients/my-pkg
```

Check integrity of cited files — compares sha256 hashes of quoted
files, reports drift or missing files:

```bash
cite check
```

Check a specific package:

```bash
cite check my-pkg
```

### File status

Files are tracked with one of three statuses:

- **quote** — exact copy, sha256 recorded, checked for drift
- **paraphrase** — intentionally modified, skipped during check
- **synthesize** — merged into an existing file, skipped during check

### Migrating from `assimilai`

If you have a legacy `[tool.assimilai]` manifest, migrate it to the
v2 `[tool.citation]` schema with:

```bash
cite migrate
```

Use `--dry-run` to preview the translation without writing.

## Documentation

- [Specification](https://citation-cli.culture.dev/spec)
- [Website](https://citation-cli.culture.dev)
