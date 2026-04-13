"""Core logic for cite add, check, and migrate commands."""

from __future__ import annotations

import hashlib
from datetime import date
from pathlib import Path
from typing import Any

from citation_cli.toml_io import (
    get_citation_packages,
    read_pyproject,
    set_citation_package,
    write_pyproject,
)

SCHEMA_VERSION = 2

# Legacy (Assimilai v1) → current (Citation v2) status values.
LEGACY_STATUS_MAP = {
    "verbatim": "quote",
    "adapted": "paraphrase",
    "dissolved": "synthesize",
}
VALID_STATUSES = {"quote", "paraphrase", "synthesize"}
SKIP_STATUSES = {"paraphrase", "synthesize"}


def _sha256(path: Path) -> str:
    """Compute sha256 hex digest of a file."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def add_citation(
    *,
    name: str,
    source: str,
    version: str,
    target: str,
    pyproject_path: str = "pyproject.toml",
) -> None:
    """Record a citation in pyproject.toml.

    Scans files in the target directory and records each as a quote
    with its sha256 hash.
    """
    target_dir = Path(target)
    if not target_dir.is_dir():
        raise FileNotFoundError(f"target directory not found: {target}")

    data = read_pyproject(pyproject_path)

    files: dict[str, dict[str, str]] = {}
    for f in sorted(target_dir.rglob("*")):
        if f.is_file() and not any(p.startswith(".") for p in f.relative_to(target_dir).parts):
            rel = str(f.relative_to(target_dir))
            files[rel] = {"status": "quote", "sha256": _sha256(f)}

    if not files:
        print(f"warning: no files found in {target}")
        return

    entry = {
        "schema": SCHEMA_VERSION,
        "source": source,
        "version": version,
        "target": target,
        "cited": date.today().isoformat(),
        "files": files,
    }

    set_citation_package(data, name, entry)
    write_pyproject(pyproject_path, data)
    print(f"recorded {len(files)} files for '{name}' in {pyproject_path}")


def check_citations(
    *,
    name: str | None = None,
    pyproject_path: str = "pyproject.toml",
) -> bool:
    """Check integrity of cited files.

    Returns True if all quoted files match their recorded hashes.
    """
    data = read_pyproject(pyproject_path)
    packages = get_citation_packages(data)

    if not packages:
        print("no citations found")
        return True

    if name:
        if name not in packages:
            print(f"error: package '{name}' not found")
            return False
        entries = {name: packages[name]}
    else:
        entries = packages
    all_ok = True

    for pkg_name, pkg in entries.items():

        target = Path(pkg.get("target", "."))
        files = pkg.get("files", {})
        print(f"\nchecking '{pkg_name}' ({len(files)} files)")

        for filename, meta in files.items():
            status = meta.get("status", "quote")

            if status in SKIP_STATUSES:
                print(f"  {filename}: SKIP ({status})")
                continue

            filepath = target / filename
            if not filepath.exists():
                print(f"  {filename}: MISSING")
                all_ok = False
                continue

            expected = meta.get("sha256", "")
            actual = _sha256(filepath)

            if actual == expected:
                print(f"  {filename}: OK")
            else:
                print(f"  {filename}: DRIFT")
                all_ok = False

    if all_ok:
        print("\nall checks passed")
    else:
        print("\ndrift detected")

    return all_ok


def migrate_manifest(
    pyproject_path: str = "pyproject.toml",
    *,
    dry_run: bool = False,
) -> int:
    """Migrate a legacy [tool.assimilai] manifest to [tool.citation] v2.

    Translates the top-level key and rewrites file statuses:
    verbatim → quote, adapted → paraphrase, dissolved → synthesize.
    Adds schema = 2 to each package entry. Also renames the
    `assimilated` date field to `cited` for consistency.

    Returns the number of file entries whose status was translated.
    Raises if [tool.citation] already exists, or if a file status is
    not recognizable in either schema.
    """
    data = read_pyproject(pyproject_path)
    tool = data.get("tool", {})

    if "citation" in tool:
        raise ValueError(
            f"[tool.citation] already exists in {pyproject_path} — "
            "refusing to overwrite"
        )
    if "assimilai" not in tool:
        raise ValueError(
            f"no [tool.assimilai] block found in {pyproject_path} — nothing to migrate"
        )

    legacy_packages = tool["assimilai"].get("packages", {})
    translated_files = 0
    new_packages: dict[str, Any] = {}

    for pkg_name, pkg in legacy_packages.items():
        new_pkg: dict[str, Any] = {"schema": SCHEMA_VERSION}
        for key, value in pkg.items():
            if key == "files":
                continue
            if key == "assimilated":
                new_pkg["cited"] = value
            else:
                new_pkg[key] = value

        new_files: dict[str, dict[str, Any]] = {}
        for filename, meta in pkg.get("files", {}).items():
            status = meta.get("status", "verbatim")
            if status in LEGACY_STATUS_MAP:
                new_status = LEGACY_STATUS_MAP[status]
                translated_files += 1
            elif status in VALID_STATUSES:
                new_status = status
            else:
                raise ValueError(
                    f"unknown status '{status}' for file '{filename}' in "
                    f"package '{pkg_name}'"
                )
            new_meta = dict(meta)
            new_meta["status"] = new_status
            new_files[filename] = new_meta
        new_pkg["files"] = new_files
        new_packages[pkg_name] = new_pkg

    if dry_run:
        print(
            f"dry-run: would translate {len(new_packages)} package(s) "
            f"and {translated_files} file status(es)"
        )
        return translated_files

    data["tool"]["citation"] = {"packages": new_packages}
    del data["tool"]["assimilai"]
    if not data["tool"]:
        del data["tool"]
    write_pyproject(pyproject_path, data)
    print(
        f"migrated {len(new_packages)} package(s) "
        f"and {translated_files} file status(es) to schema v{SCHEMA_VERSION}"
    )
    return translated_files
