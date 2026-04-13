"""Tests for citation-cli core functionality."""

import hashlib
import os
import tempfile
from pathlib import Path

import pytest

from citation_cli.core import (
    SCHEMA_VERSION,
    _sha256,
    add_citation,
    check_citations,
    migrate_manifest,
)
from citation_cli.toml_io import (
    get_citation_packages,
    read_pyproject,
    write_pyproject,
)


@pytest.fixture
def workspace(tmp_path):
    """Create a workspace with a pyproject.toml and target files."""
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text('[project]\nname = "test-project"\n')

    target = tmp_path / "target"
    target.mkdir()
    (target / "transport.py").write_text("# transport module\n")
    (target / "config.py").write_text("# config module\n")

    return tmp_path, pyproject, target


def test_sha256(tmp_path):
    f = tmp_path / "hello.txt"
    f.write_bytes(b"hello world")
    expected = hashlib.sha256(b"hello world").hexdigest()
    assert _sha256(f) == expected


def test_add_creates_citation_section(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../packages/ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    data = read_pyproject(pyproject)
    packages = get_citation_packages(data)

    assert "my-pkg" in packages
    pkg = packages["my-pkg"]
    assert pkg["schema"] == SCHEMA_VERSION
    assert pkg["source"] == "../packages/ref"
    assert pkg["version"] == "1.0.0"
    assert pkg["target"] == str(target)
    assert "cited" in pkg
    assert "files" in pkg
    assert "transport.py" in pkg["files"]
    assert "config.py" in pkg["files"]
    assert pkg["files"]["transport.py"]["status"] == "quote"
    assert "sha256" in pkg["files"]["transport.py"]


def test_add_target_not_found():
    with tempfile.NamedTemporaryFile(suffix=".toml", delete=False) as f:
        f.write(b'[project]\nname = "test"\n')
        f.flush()
        try:
            with pytest.raises(FileNotFoundError):
                add_citation(
                    name="x",
                    source=".",
                    version="1.0.0",
                    target="/nonexistent/path",
                    pyproject_path=f.name,
                )
        finally:
            os.unlink(f.name)


def test_check_all_ok(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    ok = check_citations(pyproject_path=str(pyproject))
    assert ok is True


def test_check_detects_drift(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    (target / "transport.py").write_text("# modified!\n")

    ok = check_citations(pyproject_path=str(pyproject))
    assert ok is False


def test_check_detects_missing(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    (target / "config.py").unlink()

    ok = check_citations(pyproject_path=str(pyproject))
    assert ok is False


def test_check_skips_paraphrase(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    data = read_pyproject(pyproject)
    data["tool"]["citation"]["packages"]["my-pkg"]["files"]["config.py"] = {
        "status": "paraphrase"
    }
    write_pyproject(pyproject, data)

    (target / "config.py").write_text("# completely changed\n")

    ok = check_citations(pyproject_path=str(pyproject))
    assert ok is True


def test_check_skips_synthesize(workspace):
    root, pyproject, target = workspace

    add_citation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    data = read_pyproject(pyproject)
    data["tool"]["citation"]["packages"]["my-pkg"]["files"]["config.py"] = {
        "status": "synthesize",
        "into": "app/settings.py",
    }
    write_pyproject(pyproject, data)

    (target / "config.py").unlink()

    ok = check_citations(pyproject_path=str(pyproject))
    assert ok is True


# ---------------------------------------------------------------------------
# Migration tests
# ---------------------------------------------------------------------------


LEGACY_MANIFEST = """\
[project]
name = "test-project"

[tool.assimilai.packages.harness]
source = "../ref"
version = "0.6.0"
target = "vendor/harness"
assimilated = "2026-03-24"

[tool.assimilai.packages.harness.files]
"transport.py" = { status = "verbatim", sha256 = "abc" }
"adapter.py" = { status = "adapted" }
"config.py" = { status = "dissolved", into = "app/settings.py" }
"""


def _write_legacy(tmp_path):
    p = tmp_path / "pyproject.toml"
    p.write_text(LEGACY_MANIFEST)
    return p


def test_migrate_translates_v1_to_v2(tmp_path):
    pyproject = _write_legacy(tmp_path)

    translated = migrate_manifest(pyproject_path=str(pyproject))
    assert translated == 3

    data = read_pyproject(pyproject)
    assert "assimilai" not in data.get("tool", {})
    pkg = data["tool"]["citation"]["packages"]["harness"]
    assert pkg["schema"] == SCHEMA_VERSION
    assert pkg["cited"] == "2026-03-24"
    assert pkg["files"]["transport.py"]["status"] == "quote"
    assert pkg["files"]["adapter.py"]["status"] == "paraphrase"
    assert pkg["files"]["config.py"]["status"] == "synthesize"
    assert pkg["files"]["config.py"]["into"] == "app/settings.py"


def test_migrate_dry_run_does_not_write(tmp_path):
    pyproject = _write_legacy(tmp_path)
    original = pyproject.read_text()

    translated = migrate_manifest(pyproject_path=str(pyproject), dry_run=True)
    assert translated == 3
    assert pyproject.read_text() == original


def test_migrate_rejects_existing_v2(tmp_path):
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        '[project]\nname = "x"\n\n[tool.citation]\nplaceholder = true\n'
    )
    with pytest.raises(ValueError, match="already exists"):
        migrate_manifest(pyproject_path=str(pyproject))


def test_migrate_rejects_missing_legacy(tmp_path):
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text('[project]\nname = "x"\n')
    with pytest.raises(ValueError, match="nothing to migrate"):
        migrate_manifest(pyproject_path=str(pyproject))


def test_migrate_rejects_unknown_status(tmp_path):
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        '[project]\nname = "x"\n\n'
        "[tool.assimilai.packages.harness.files]\n"
        '"a.py" = { status = "sublimated" }\n'
    )
    with pytest.raises(ValueError, match="unknown status"):
        migrate_manifest(pyproject_path=str(pyproject))
