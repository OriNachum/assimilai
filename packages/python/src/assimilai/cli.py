"""CLI entry point for assimilai."""

from __future__ import annotations

import argparse
import sys

from assimilai.core import check_assimilation, init_assimilation


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="assimilai",
        description="Track assimilated code in pyproject.toml",
    )
    parser.add_argument(
        "--version", action="store_true", help="show version and exit"
    )
    sub = parser.add_subparsers(dest="command")

    # init
    init_p = sub.add_parser("init", help="record an assimilation")
    init_p.add_argument("name", help="entry name (e.g. agent-harness)")
    init_p.add_argument("--source", required=True, help="path or URL to reference")
    init_p.add_argument("--version", dest="ref_version", required=True, help="reference version")
    init_p.add_argument("--target", required=True, help="local directory where files were placed")
    init_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")

    # check
    check_p = sub.add_parser("check", help="verify assimilated file integrity")
    check_p.add_argument("name", nargs="?", help="entry name (omit to check all)")
    check_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")

    args = parser.parse_args(argv)

    if args.version:
        from assimilai import __version__
        print(f"assimilai {__version__}")
        return

    if args.command == "init":
        init_assimilation(
            name=args.name,
            source=args.source,
            version=args.ref_version,
            target=args.target,
            pyproject_path=args.pyproject,
        )
    elif args.command == "check":
        ok = check_assimilation(
            name=args.name,
            pyproject_path=args.pyproject,
        )
        if not ok:
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)
