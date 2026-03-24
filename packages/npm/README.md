# assimilai

Copy, don't import — track assimilated code in `package.json`.

## Install

```bash
npm install -g assimilai
```

Or as a dev dependency:

```bash
npm install --save-dev assimilai
```

## Usage

Record an assimilation — scans files in the target directory
and records each with its sha256 hash in `package.json`:

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
