"""Architect Docs Engine local inspection and validation commands.

Semantic document generation requires the AI agent; this CLI never pretends to
infer complete architecture documents from filenames or call an LLM service.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from check_traceability import check_traceability
from common import emit
from report_audit import build_report
from scan_workspace import scan_workspace
from snapshot_workspace import snapshot_workspace
from validate_docs import validate_docs
from validate_config import validate_config
from validate_skill import validate_skill

def parser_for() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, epilog="Exit codes: 0 no hard mechanical failure (warnings or readiness blockers may remain), 1 hard validation/conflict finding, 2 invalid invocation, 3 read/permission error.")
    sub = parser.add_subparsers(dest="command", required=True)
    skill_cmd = sub.add_parser("validate-skill", help="Check this skill's resources and manifest")
    skill_cmd.add_argument("--json", action="store_true", help="Print machine-readable results")
    for name, help_text in (("inspect", "Safely inventory a target workspace"), ("audit", "Audit the 21-document suite and traceability"), ("traceability", "Check stable ID definitions and references"), ("validate-config", "Check optional target configuration")):
        cmd = sub.add_parser(name, help=help_text)
        cmd.add_argument("--project", required=True, help="Existing target project directory")
        cmd.add_argument("--json", action="store_true", help="Print machine-readable output")
    snapshot = sub.add_parser("snapshot", help="Preview or store safe source hashes for later staleness checks")
    snapshot.add_argument("--project", required=True, help="Existing target project directory")
    snapshot.add_argument("--write", action="store_true", help="Write a source snapshot; preview is the default")
    snapshot.add_argument("--dry-run", action="store_true", help="Preview without writing")
    snapshot.add_argument("--force", action="store_true", help="Back up and replace an existing snapshot")
    snapshot.add_argument("--json", action="store_true", help="Print machine-readable output")
    return parser

def main(argv: list[str] | None = None) -> int:
    parser = parser_for()
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return int(exc.code)
    try:
        if args.command == "validate-skill":
            result = validate_skill()
        elif args.command == "inspect":
            result = scan_workspace(args.project)
        elif args.command == "traceability":
            result = check_traceability(args.project)
        elif args.command == "validate-config":
            result = validate_config(args.project)
        elif args.command == "snapshot":
            result = snapshot_workspace(args.project, write=args.write, dry_run=args.dry_run, force=args.force)
        elif args.command == "audit":
            result = build_report(args.project)
        else:
            parser.error("Unsupported command")
            return 2
    except (OSError, ValueError) as exc:
        print(f"Read error: {exc}", file=sys.stderr)
        return 3
    emit(result, getattr(args, "json", False))
    if args.command == "validate-skill":
        return 0 if result["ok"] else 1
    if args.command == "traceability":
        return 0 if result["ok"] else 1
    if args.command == "validate-config":
        return 0 if result["ok"] else 1
    if args.command == "snapshot":
        return 0
    if args.command == "audit":
        return 0 if result["status"] != "FAIL" else 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
