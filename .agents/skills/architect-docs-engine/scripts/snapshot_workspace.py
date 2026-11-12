"""Preview or record a safe source-file hash baseline under .architect-docs/."""
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import emit, safe_project_path, within
from scan_workspace import scan_workspace

def build_snapshot(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    scan = scan_workspace(root)
    config_path = root / "architect-docs.config.json"
    docs_name = "docs"
    if config_path.is_file() and within(config_path, root):
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
            candidate = config.get("docs", {}).get("output_dir", "docs") if isinstance(config, dict) else "docs"
            if isinstance(candidate, str) and candidate and within(root / candidate, root):
                docs_name = candidate.replace("\\", "/").strip("/")
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            pass
    files = []
    unhashed = []
    for item in scan["inventory"]:
        rel = item["path"]
        if rel == docs_name or rel.startswith(docs_name + "/") or rel.startswith(".architect-docs/"):
            continue
        if item.get("sha256"):
            files.append({"path": rel, "sha256": item["sha256"], "size_bytes": item["size_bytes"]})
        else:
            unhashed.append(rel)
    files.sort(key=lambda item: item["path"])
    return {"schema_version":"1.0","generated_at_utc":datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "scope":"bounded non-document files under project root; content stored only as safe-file hashes",
            "files":files,"unhashed_paths":sorted(unhashed),"summary":f"Snapshot contains {len(files)} hashed source/config files and {len(unhashed)} un-hashed paths."}

def snapshot_workspace(project: str | Path, *, write: bool = False, dry_run: bool = False, force: bool = False) -> dict[str, Any]:
    root = safe_project_path(project)
    state_dir = root / ".architect-docs"
    destination = state_dir / "source-snapshot.json"
    if state_dir.exists() and not within(state_dir, root):
        raise ValueError(".architect-docs resolves outside the selected project")
    if force and not write:
        raise ValueError("--force requires --write")
    snapshot = build_snapshot(root)
    snapshot["project_root"] = str(root)
    snapshot["destination"] = str(destination)
    snapshot["would_write"] = bool(write and not dry_run)
    backup = None
    if write and not dry_run:
        state_dir.mkdir(parents=True, exist_ok=True)
        if not within(destination, root):
            raise ValueError("Snapshot destination resolves outside the selected project")
        if destination.exists():
            if not force:
                raise FileExistsError(f"Snapshot already exists; use --force after reviewing it: {destination}")
            backup = destination.with_name("source-snapshot.backup-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + ".json")
            if backup.exists():
                raise FileExistsError(f"Backup already exists: {backup}")
            shutil.copy2(destination, backup)
        temp = destination.with_suffix(".json.tmp")
        try:
            temp.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            temp.replace(destination)
        finally:
            if temp.exists() and within(temp, state_dir):
                temp.unlink()
    if backup:
        snapshot["backup"] = str(backup)
    return snapshot

def main(argv: list[str] | None = None) -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project",required=True,help="Existing target project directory")
    parser.add_argument("--write",action="store_true",help="Write source snapshot; default is preview only")
    parser.add_argument("--dry-run",action="store_true",help="Preview the snapshot write without changing files")
    parser.add_argument("--force",action="store_true",help="Back up and replace an existing snapshot")
    parser.add_argument("--json",action="store_true",help="Print machine-readable snapshot result")
    args=parser.parse_args(argv)
    try: result=snapshot_workspace(args.project,write=args.write,dry_run=args.dry_run,force=args.force)
    except FileExistsError as exc: print(f"Conflict: {exc}"); return 1
    except (OSError,ValueError) as exc: print(f"Read/write error: {exc}"); return 3
    if not args.json and not result["would_write"]: result["summary"]="Preview only; no snapshot file was written. "+result["summary"]
    emit(result,args.json); return 0

if __name__ == "__main__": raise SystemExit(main())
