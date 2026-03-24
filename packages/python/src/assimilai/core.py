"""Core logic for assimilai init and check commands."""

from __future__ import annotations

import hashlib
from datetime import date
from pathlib import Path

from assimilai.toml_io import (
    get_assimilai_packages,
    read_pyproject,
    set_assimilai_package,
    write_pyproject,
)


def _sha256(path: Path) -> str:
    """Compute sha256 hex digest of a file."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def init_assimilation(
    *,
    name: str,
    source: str,
    version: str,
    target: str,
    pyproject_path: str = "pyproject.toml",
) -> None:
    """Record an assimilation in pyproject.toml.

    Scans files in the target directory and records each as verbatim
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
            files[rel] = {"status": "verbatim", "sha256": _sha256(f)}

    if not files:
        print(f"warning: no files found in {target}")
        return

    entry = {
        "source": source,
        "version": version,
        "target": target,
        "assimilated": date.today().isoformat(),
        "files": files,
    }

    set_assimilai_package(data, name, entry)
    write_pyproject(pyproject_path, data)
    print(f"recorded {len(files)} files for '{name}' in {pyproject_path}")


def check_assimilation(
    *,
    name: str | None = None,
    pyproject_path: str = "pyproject.toml",
) -> bool:
    """Check integrity of assimilated files.

    Returns True if all verbatim files match their recorded hashes.
    """
    data = read_pyproject(pyproject_path)
    packages = get_assimilai_packages(data)

    if not packages:
        print("no assimilai packages found")
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
            status = meta.get("status", "verbatim")

            if status in ("adapted", "dissolved"):
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
