"""CLI entry point for citation-cli (`cite`)."""

from __future__ import annotations

import argparse
import sys

from citation_cli.core import (
    add_citation,
    check_citations,
    migrate_manifest,
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="cite",
        description="Track cited code in pyproject.toml — "
        "Quote / Paraphrase / Synthesize.",
    )
    parser.add_argument(
        "--version", action="store_true", help="show version and exit"
    )
    sub = parser.add_subparsers(dest="command")

    # add
    add_p = sub.add_parser("add", help="record a citation")
    add_p.add_argument("name", help="entry name (e.g. agent-harness)")
    add_p.add_argument("--source", required=True, help="path or URL to reference")
    add_p.add_argument("--version", dest="ref_version", required=True, help="reference version")
    add_p.add_argument("--target", required=True, help="local directory where files were placed")
    add_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")

    # check
    check_p = sub.add_parser("check", help="verify quoted file integrity")
    check_p.add_argument("name", nargs="?", help="entry name (omit to check all)")
    check_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")

    # migrate
    migrate_p = sub.add_parser(
        "migrate",
        help="migrate legacy [tool.assimilai] manifest to [tool.citation] v2",
    )
    migrate_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")
    migrate_p.add_argument(
        "--dry-run",
        action="store_true",
        help="show what would change without writing",
    )

    # sync (placeholder for 0.2.0 — propagation-from-source)
    sync_p = sub.add_parser(
        "sync",
        help="update quoted files from the source reference (not yet implemented)",
    )
    sync_p.add_argument("name", nargs="?", help="entry name (omit to sync all)")
    sync_p.add_argument("--pyproject", default="pyproject.toml", help="path to pyproject.toml")

    args = parser.parse_args(argv)

    if args.version:
        from citation_cli import __version__
        print(f"cite {__version__}")
        return

    if args.command == "add":
        add_citation(
            name=args.name,
            source=args.source,
            version=args.ref_version,
            target=args.target,
            pyproject_path=args.pyproject,
        )
    elif args.command == "check":
        ok = check_citations(
            name=args.name,
            pyproject_path=args.pyproject,
        )
        if not ok:
            sys.exit(1)
    elif args.command == "migrate":
        try:
            migrate_manifest(
                pyproject_path=args.pyproject,
                dry_run=args.dry_run,
            )
        except (FileNotFoundError, ValueError) as e:
            print(f"error: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.command == "sync":
        print(
            "cite sync: not yet implemented. Scheduled for 0.2.0.\n"
            "See https://culture.dev/citation-cli/spec/#propagation for the "
            "propagation rules the command will follow."
        )
        sys.exit(2)
    else:
        parser.print_help()
        sys.exit(1)
