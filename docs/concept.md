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

**Monorepo shared packages** (internal npm packages, Python
namespace packages) use import-time linking. Changes to the
shared package affect all consumers simultaneously. Assimilai
avoids this coupling by design.

**Assimilai** is closest to vendoring but with three differences:
you're expected to modify the code, you can dissolve it into
existing files, and the metadata tracks provenance so you can
propagate reference updates when you choose to.

</div>
