---
layout: default
title: The Concept
---

<div class="post-content" markdown="1">

## The Concept

### The assumption gap

Traditional package management assumes every consumer wants
identical behavior from a shared dependency. You publish a
package, pin a version, and every consumer gets the same code.

That assumption works when consumers are interchangeable. It
breaks when consumers are **expected to diverge** — when each
one wraps a different SDK, speaks a different protocol, or
integrates at fundamentally different points.

Assimilai starts from the opposite assumption: consumers will
diverge, and the system should make that safe.

### Why copy beats import

When you import a shared package, you accept a contract: the
package controls its own internals, and you call its public API.
That works until you need to change the internals — add a
field to a data structure, swap an I/O layer, rearrange the
module boundaries.

With Assimilai, you copy the reference and own the result. The
reference is a starting point, not a constraint. You adapt what
needs adapting, keep what works, and dissolve code into your
existing files where it fits naturally.

The trade-off is explicit: you give up automatic updates in
exchange for full independence. But the metadata tracks what
came from where, so updates are informed rather than blind.

### Monorepos

Assimilai is a natural fit for monorepos. In a monorepo, you
already own the source code for your internal packages — publishing
them to a registry just to import them back is unnecessary
ceremony.

Traditional monorepo tooling (npm workspaces, Python namespace
packages, Bazel targets) uses import-time linking to share code
between packages. This avoids the publish step, but creates its
own friction: symlinks, workspace hoisting, version conflicts
between internal and external dependencies, and debugging through
package boundaries instead of just reading the file.

Assimilai removes the middleman entirely. Copy from `packages/`
into your target directory, modify freely, debug directly. The
code lives where it runs — no indirection, no build-tool magic,
no "which version of the internal package am I actually using?"

The metadata in `pyproject.toml` or `package.json` tracks what
came from where, so you maintain provenance without maintaining
a package registry.

### Three placement modes

When assimilating code, each file lands in one of three states:

**Verbatim** — the file was copied without modification. Its
sha256 hash is recorded so drift detection works. Generic
infrastructure (transport layers, IPC, socket servers) typically
stays verbatim.

**Adapted** — the file was copied and then intentionally
modified. No hash is recorded because divergence is the point.
Agent-specific files (runners, supervisors, daemons) are
typically adapted.

**Dissolved** — the file's contents were extracted and merged
into an existing consumer file. There is no standalone copy.
This is the most organic mode — a `load_config()` function
absorbed into your existing `settings.py` rather than kept as
a separate `config.py`.

### How it compares

**Vendoring** copies dependencies into your tree, but vendored
code is usually kept separate and untouched — `vendor/` is a
frozen snapshot. Assimilai expects you to modify the code and
dissolve it into your own structure.

**Git submodules** link a subdirectory to another repo. You get
updates by pulling, but you don't own the code — changes require
forking or patching. Assimilai gives you full ownership from the
start.

**Monorepo workspace tooling** (npm workspaces, Python namespace
packages, Bazel) uses import-time linking within the monorepo.
This avoids the external publish step but couples all consumers
to the same version of shared code — changes propagate
immediately to every consumer. Assimilai is also designed for
monorepos but takes the opposite approach: each consumer gets
its own copy and evolves independently.

**Assimilai** is closest to vendoring but with three differences:
you're expected to modify the code, you can dissolve it into
existing files, and the metadata tracks provenance so you can
propagate reference updates when you choose to.

</div>
