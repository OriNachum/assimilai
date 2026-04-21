# citation-cli

**Cite, don't import.** A code distribution pattern with
**Quote / Paraphrase / Synthesize** semantics, for codebases where
consumers are expected to diverge.

> citation-cli is the successor to **assimilai**. Run `cite migrate`
> to convert any existing `[tool.assimilai]` or `"assimilai"`
> manifests to the v2 schema. The legacy `assimilai` packages on
> PyPI and npm will be frozen at their current version and marked
> deprecated once the first `citation-cli` release lands.

## The idea

Copy the reference into your project as organic code. Each consumer
owns its copy and modifies it independently.

```text
packages/reference/       -->  cite  -->  clients/backend-a/
                          -->  cite  -->  clients/backend-b/
                          -->  cite  -->  clients/backend-c/
```

No shared imports. No version pinning. No breakage when one project
evolves.

Each file lands at one of three levels of engagement:

- **Quote** — copied verbatim. Integrity checked via sha256.
- **Paraphrase** — rewritten in your terms. Logic preserved, code
  adapted.
- **Synthesize** — absorbed into an existing file. No standalone
  copy remains.

## CLI

Track cited code with metadata in your project manifest.

**Python** — `[tool.citation]` in `pyproject.toml`:

```bash
uv tool install citation-cli
cite add my-pkg --source ../ref --version 1.0.0 --target ./src/my-pkg
cite check
```

**Node.js** — `"citation"` key in `package.json`:

```bash
npm install -g citation-cli
cite add my-pkg --source ../ref --version 1.0.0 --target ./src/my-pkg
cite check
```

**Migrate from assimilai:**

```bash
cite migrate             # rewrite in place
cite migrate --dry-run   # preview
```

## Documentation

- [The Concept](https://culture.dev/citation-cli/concept) — why
  cite beats import
- [Python CLI](https://culture.dev/citation-cli/python) — full
  reference
- [npm CLI](https://culture.dev/citation-cli/npm) — full reference
- [When Not to Use](https://culture.dev/citation-cli/when-not-to-use)
- [Migration](https://culture.dev/citation-cli/migration) — from
  assimilai v1 to citation-cli v2
- [Specification](https://culture.dev/citation-cli/spec) — formal
  schema

## License

MIT
