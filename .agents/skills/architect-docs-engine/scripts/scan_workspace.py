"""Bounded, read-only workspace inventory. Never executes target code."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from common import detect_secrets, emit, safe_project_path

SKIP_DIRS = {".git", ".hg", ".svn", ".venv", "venv", "node_modules", "dist", "build", "coverage", "__pycache__", ".next", ".cache", "vendor", ".aws", ".ssh", ".gnupg", ".architect-docs"}
SECRET_NAMES = {".env", ".env.local", ".npmrc", ".pypirc", "id_rsa", "id_ed25519", "credentials", "secrets.json"}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".keystore"}
MAX_BYTES = 1_000_000
MAX_DEPTH = 8
MAX_FILES = 5000

def scan_workspace(project: str | Path, max_files: int = MAX_FILES) -> dict[str, Any]:
    root = safe_project_path(project)
    inventory: list[dict[str, Any]] = []
    skipped: dict[str, int] = {"sensitive": 0, "symlink_escape": 0, "oversized": 0, "binary": 0, "limit": 0}
    manifests: list[str] = []
    examined = 0
    for current, dirs, files in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        depth = len(current_path.relative_to(root).parts)
        kept_dirs = []
        for name in sorted(dirs):
            examined += 1
            if examined > max_files:
                skipped["limit"] += 1
                continue
            candidate = current_path / name
            if name.lower() in SKIP_DIRS:
                continue
            if depth >= MAX_DEPTH:
                continue
            if candidate.is_symlink() and not _is_within(candidate, root):
                skipped["symlink_escape"] += 1
                continue
            kept_dirs.append(name)
        dirs[:] = kept_dirs
        for name in sorted(files):
            examined += 1
            if examined > max_files:
                skipped["limit"] += 1
                dirs[:] = []
                break
            path = current_path / name
            rel = path.relative_to(root).as_posix()
            lower = name.lower()
            if lower in SECRET_NAMES or Path(lower).suffix in SECRET_SUFFIXES or lower.startswith(".env.") and lower not in {".env.example", ".env.sample"}:
                skipped["sensitive"] += 1
                continue
            if path.is_symlink() and not _is_within(path, root):
                skipped["symlink_escape"] += 1
                continue
            try:
                stat = path.stat()
            except OSError:
                continue
            if stat.st_size > MAX_BYTES:
                skipped["oversized"] += 1
                continue
            kind = _classify(name, rel)
            entry: dict[str, Any] = {"path": rel, "kind": kind, "size_bytes": stat.st_size}
            if lower in {"package.json", "pyproject.toml", "cargo.toml", "go.mod", "pom.xml", "build.gradle", "requirements.txt", "composer.json", "gemfile"}:
                manifests.append(rel)
            if path.suffix.lower() in {".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".md", ".toml", ".json", ".yml", ".yaml", ".sql", ".html", ".css"} or lower in {"dockerfile", "makefile"}:
                try:
                    raw = path.read_bytes()
                    text = raw.decode("utf-8")
                except (OSError, UnicodeDecodeError):
                    skipped["binary"] += 1
                    continue
                if detect_secrets(text):
                    entry["content_check"] = "secret-like content detected; values omitted"
                    entry["sha256"] = None
                else:
                    entry["sha256"] = hashlib.sha256(raw).hexdigest()
            inventory.append(entry)
    feature_signals = {
        "api": any(x["kind"] == "route_or_api" for x in inventory),
        "database": any(x["kind"] == "schema_or_migration" for x in inventory),
        "tests": any(x["kind"] == "test" for x in inventory),
        "ui": any(x["kind"] == "ui" for x in inventory),
        "ai": any(any(word in x["path"].lower() for word in ("prompt", "agent", "llm", "mcp")) for x in inventory),
    }
    return {"project_root": str(root), "read_only": True, "executed_target_code": False,
            "limits": {"max_depth": MAX_DEPTH, "max_file_bytes": MAX_BYTES, "max_files": max_files},
            "files_scanned": len(inventory), "manifests": manifests, "feature_signals": feature_signals,
            "skipped_counts": skipped, "path_signals": feature_signals, "path_signals_are_heuristic": True, "inventory": inventory,
            "summary": f"Inspected {len(inventory)} bounded file entries under {root}; target code was not executed."}

def _is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except (ValueError, OSError):
        return False

def _classify(name: str, rel: str) -> str:
    lower = rel.lower()
    if any(part in lower for part in ("test", "spec")) or name.lower().startswith(("test_", "spec_")):
        return "test"
    if any(s in lower for s in ("migration", "schema", "models/", "models\\")) or name.lower().endswith(".sql"):
        return "schema_or_migration"
    if any(s in lower for s in ("route", "endpoint", "controller", "api/")):
        return "route_or_api"
    if any(s in lower for s in ("component", "view", "page", "ui/", "frontend/")) or name.lower().endswith((".tsx", ".jsx", ".html", ".css")):
        return "ui"
    if name.lower() in {"package.json", "pyproject.toml", "cargo.toml", "go.mod", "pom.xml", "requirements.txt", "composer.json", "gemfile", "dockerfile", "makefile"}:
        return "manifest_or_workflow"
    if name.lower().endswith((".md", ".rst")):
        return "documentation"
    return "source_or_config"

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Existing target project directory")
    parser.add_argument("--json", action="store_true", help="Print stable JSON inventory")
    args = parser.parse_args(argv)
    try:
        result = scan_workspace(args.project)
    except (OSError, ValueError) as exc:
        print(f"Read error: {exc}")
        return 3
    emit(result, args.json)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
