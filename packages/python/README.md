# assimilai

Copy, don't import — track assimilated code in `pyproject.toml`.

## Install

```bash
uv tool install assimilai
```

Or with pip:

```bash
pip install assimilai
```

## Usage

Record an assimilation — scans files in the target directory
and records each with its sha256 hash in `pyproject.toml`:

```bash
assimilai init my-pkg \
  --source ../packages/ref \
  --version 1.0.0 \
  --target ./src/clients/my-pkg
```

Check integrity of assimilated files — compares sha256 hashes
of verbatim files, reports drift or missing files:

```bash
assimilai check
```

Check a specific package:

```bash
assimilai check my-pkg
```

### File status

Files are tracked with one of three statuses:

- **verbatim** — exact copy, sha256 recorded, checked for drift
- **adapted** — intentionally modified, skipped during check
- **dissolved** — merged into existing file, skipped during check

## Documentation

- [Specification](https://assimilai.dev/spec)
- [Website](https://assimilai.dev)
