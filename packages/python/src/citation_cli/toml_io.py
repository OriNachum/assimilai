"""Read/write [tool.citation] in pyproject.toml."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import tomli_w

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib


def read_pyproject(path: str | Path) -> dict[str, Any]:
    """Read and parse pyproject.toml."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"{p} not found")
    with p.open("rb") as f:
        return tomllib.load(f)


def write_pyproject(path: str | Path, data: dict[str, Any]) -> None:
    """Write data back to pyproject.toml."""
    p = Path(path)
    with p.open("wb") as f:
        tomli_w.dump(data, f)


def get_citation_packages(data: dict[str, Any]) -> dict[str, Any]:
    """Extract [tool.citation.packages] from parsed pyproject data."""
    return data.get("tool", {}).get("citation", {}).get("packages", {})


def set_citation_package(
    data: dict[str, Any], name: str, entry: dict[str, Any]
) -> dict[str, Any]:
    """Set a package entry under [tool.citation.packages]."""
    data.setdefault("tool", {})
    data["tool"].setdefault("citation", {})
    data["tool"]["citation"].setdefault("packages", {})
    data["tool"]["citation"]["packages"][name] = entry
    return data
