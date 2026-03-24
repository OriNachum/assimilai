# Assimilai

**Copy, don't import.** A code distribution pattern for AI agent
ecosystems.

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

## CLI Tools

Track assimilated code with metadata in your project manifest.

**Python** — `[tool.assimilai]` in `pyproject.toml`:

```bash
uv tool install assimilai
assimilai init my-pkg --source ../ref --version 1.0.0 --target ./src/my-pkg
assimilai check
```

**Node.js** — `"assimilai"` key in `package.json`:

```bash
npm install -g assimilai
assimilai init my-pkg --source ../ref --version 1.0.0 --target ./src/my-pkg
assimilai check
```

## Documentation

- [The Concept](https://assimilai.dev/docs/concept) — why
  copy beats import
- [Python CLI](https://assimilai.dev/docs/python) — full
  reference
- [npm CLI](https://assimilai.dev/docs/npm) — full reference
- [When Not to Use](https://assimilai.dev/docs/when-not-to-use)
- [Specification](https://assimilai.dev/spec) — formal schema

## License

MIT
