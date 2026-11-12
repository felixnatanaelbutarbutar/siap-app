"""Build a timestamped audit report from the deterministic suite and ID checks."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from check_traceability import check_traceability
from common import emit, safe_project_path, within
from snapshot_workspace import build_snapshot
from validate_docs import validate_docs

def check_source_freshness(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    state = root / ".architect-docs" / "source-snapshot.json"
    if not state.exists() and not state.is_symlink():
        return {"status":"NOT_ASSESSED","reason":"No source snapshot baseline exists; run the snapshot command to enable deterministic stale-source checks.","changes":{}}
    if not within(state, root):
        return {"status":"INVALID_BASELINE","reason":"Snapshot path resolves outside the selected project.","changes":{}}
    try:
        if state.stat().st_size > 8_000_000:
            raise ValueError("snapshot exceeds the 8 MB read limit")
        baseline = json.loads(state.read_text(encoding="utf-8"))
        baseline_files = baseline.get("files")
        if baseline.get("schema_version") != "1.0" or not isinstance(baseline_files, list):
            raise ValueError("unsupported snapshot structure")
        if len(baseline_files) > 5000:
            raise ValueError("snapshot contains more than 5000 records")
        old = {item["path"]: item["sha256"] for item in baseline_files if isinstance(item, dict) and isinstance(item.get("path"), str) and isinstance(item.get("sha256"), str)}
        current = build_snapshot(root)
        new = {item["path"]: item["sha256"] for item in current["files"]}
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError, RecursionError) as exc:
        return {"status":"INVALID_BASELINE","reason":f"Cannot use source snapshot: {exc}","changes":{}}
    changes = {"added":sorted(set(new)-set(old)),"removed":sorted(set(old)-set(new)),
               "changed":sorted(path for path in set(old)&set(new) if old[path] != new[path])}
    stale = any(changes.values())
    return {"status":"STALE" if stale else "CURRENT","snapshot_generated_at_utc":baseline.get("generated_at_utc"),
            "changes":changes,"unhashed_paths_count":max(len(baseline.get("unhashed_paths",[])),len(current.get("unhashed_paths",[]))),
            "reason":"Source/config paths differ from the recorded baseline." if stale else "Hashed source/config files match the recorded baseline."}

def build_report(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    docs_result = validate_docs(root)
    trace_result = check_traceability(root)
    freshness = check_source_freshness(root)
    blockers = []
    if not docs_result["ok"]:
        blockers.append("The documentation suite has fatal structural or safety findings.")
    if not trace_result["ok"]:
        blockers.append("The ID graph has duplicate definitions or dangling references.")
    if freshness["status"] == "INVALID_BASELINE":
        blockers.append("The stored source snapshot is invalid or escapes the project.")
    unresolved_count = trace_result.get("counts", {}).get("unresolved", 0)
    freshness_incomplete = freshness.get("unhashed_paths_count", 0) > 0
    warnings = docs_result["status"] == "PASS_WITH_WARNINGS" or bool(trace_result["findings"]) or unresolved_count > 0 or freshness["status"] == "STALE" or freshness_incomplete
    readiness_blockers = []
    if unresolved_count:
        readiness_blockers.append(f"{unresolved_count} unresolved statement(s) require evidence or decisions before release readiness can be assessed.")
    if freshness["status"] == "STALE":
        readiness_blockers.append("The source snapshot is stale and affected documentation needs review.")
    if freshness_incomplete:
        readiness_blockers.append("Source freshness coverage is incomplete for files with secret-like content.")
    status = "FAIL" if blockers else "BLOCKED" if readiness_blockers else "PASS_WITH_WARNINGS" if warnings else "PASS"
    score = max(0, docs_result["score"] - (20 if not trace_result["ok"] else 0) - (5 if freshness["status"] == "STALE" or freshness_incomplete else 0))
    findings = [{"severity":"ERROR","message":message} for message in blockers]
    if unresolved_count:
        findings.append({"severity":"WARNING","message":f"{unresolved_count} unresolved statement(s) need evidence review; release readiness remains blocked."})
    if freshness["status"] == "STALE":
        findings.append({"severity":"WARNING","message":"Source snapshot is stale; review affected documents before release."})
    if freshness_incomplete:
        findings.append({"severity":"WARNING","message":"Source freshness coverage is incomplete for files with secret-like content."})
    findings.extend(trace_result.get("findings", []))
    findings.extend(item for item in docs_result.get("findings", []) if item not in findings)
    warnings_list = [f"{unresolved_count} unresolved statement(s) require evidence review."] if unresolved_count else []
    if freshness["status"] == "STALE":
        warnings_list.append("Source snapshot is stale; affected documentation needs review.")
    if freshness_incomplete:
        warnings_list.append("Source freshness coverage is incomplete for files with secret-like content.")
    if freshness["status"] == "NOT_ASSESSED":
        findings.append({"severity":"INFO","message":"Source freshness was not assessed because no snapshot baseline exists."})
    freshness_label = freshness["status"].lower().replace("_", " ")
    return {"schema_version": "1.0", "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "project_root": str(root), "command": "python .agents/skills/architect-docs-engine/scripts/cli.py audit --project <target>",
            "status": status, "score": score, "checks": {"docs": docs_result, "traceability": trace_result, "source_freshness": freshness},
            "blockers": blockers, "readiness_blockers": readiness_blockers, "warnings": warnings_list,
            "release_readiness": "blocked" if blockers or readiness_blockers else "requires human evidence review",
            "findings": findings,
            "summary": f"Audit report: {status}; score {score}/100; {len(blockers)} blocker(s); {unresolved_count} unresolved statement(s); source freshness {freshness_label}."}

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Existing target project directory")
    parser.add_argument("--json", action="store_true", help="Print machine-readable report")
    parser.add_argument("--output", help="Write report to a new path under target/docs")
    parser.add_argument("--dry-run", action="store_true", help="Preview an optional report write without creating files")
    args = parser.parse_args(argv)
    try:
        report = build_report(args.project)
        if args.output:
            root = safe_project_path(args.project)
            if not (root / "docs").is_dir() or not (root / "docs").resolve().is_relative_to(root):
                raise ValueError("Cannot write an audit report because docs is missing or escapes the selected project")
            output = Path(args.output)
            if not output.is_absolute():
                output = root / "docs" / output
            output = output.resolve()
            output.relative_to((root / "docs").resolve())
            if output.exists():
                raise FileExistsError(f"Refusing to overwrite existing report: {output}")
            if args.dry_run:
                report["output_preview"] = str(output)
            else:
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except FileExistsError as exc:
        print(f"Conflict: {exc}")
        return 1
    except (OSError, ValueError) as exc:
        print(f"Read/write error: {exc}")
        return 3
    emit(report, args.json)
    return 0 if report["status"] != "FAIL" else 1

if __name__ == "__main__":
    raise SystemExit(main())
