"""Tests for assimilai core functionality."""

import hashlib
import os
import tempfile
from pathlib import Path

import pytest

from assimilai.core import _sha256, check_assimilation, init_assimilation
from assimilai.toml_io import get_assimilai_packages, read_pyproject


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


def test_init_creates_assimilai_section(workspace):
    root, pyproject, target = workspace

    init_assimilation(
        name="my-pkg",
        source="../packages/ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    data = read_pyproject(pyproject)
    packages = get_assimilai_packages(data)

    assert "my-pkg" in packages
    pkg = packages["my-pkg"]
    assert pkg["source"] == "../packages/ref"
    assert pkg["version"] == "1.0.0"
    assert pkg["target"] == str(target)
    assert "files" in pkg
    assert "transport.py" in pkg["files"]
    assert "config.py" in pkg["files"]
    assert pkg["files"]["transport.py"]["status"] == "verbatim"
    assert "sha256" in pkg["files"]["transport.py"]


def test_init_target_not_found():
    with tempfile.NamedTemporaryFile(suffix=".toml", delete=False) as f:
        f.write(b'[project]\nname = "test"\n')
        f.flush()
        try:
            with pytest.raises(FileNotFoundError):
                init_assimilation(
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

    init_assimilation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    ok = check_assimilation(pyproject_path=str(pyproject))
    assert ok is True


def test_check_detects_drift(workspace):
    root, pyproject, target = workspace

    init_assimilation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    # Modify a file to cause drift
    (target / "transport.py").write_text("# modified!\n")

    ok = check_assimilation(pyproject_path=str(pyproject))
    assert ok is False


def test_check_detects_missing(workspace):
    root, pyproject, target = workspace

    init_assimilation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    # Delete a file
    (target / "config.py").unlink()

    ok = check_assimilation(pyproject_path=str(pyproject))
    assert ok is False


def test_check_skips_adapted(workspace):
    root, pyproject, target = workspace

    init_assimilation(
        name="my-pkg",
        source="../ref",
        version="1.0.0",
        target=str(target),
        pyproject_path=str(pyproject),
    )

    # Manually mark config.py as adapted
    data = read_pyproject(pyproject)
    data["tool"]["assimilai"]["packages"]["my-pkg"]["files"]["config.py"] = {
        "status": "adapted"
    }
    from assimilai.toml_io import write_pyproject
    write_pyproject(pyproject, data)

    # Modify the adapted file — should not cause drift
    (target / "config.py").write_text("# completely changed\n")

    ok = check_assimilation(pyproject_path=str(pyproject))
    assert ok is True
