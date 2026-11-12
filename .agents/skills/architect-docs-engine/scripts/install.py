"""Safely install only the skill folder into workspace or Antigravity global scope."""
from __future__ import annotations

import argparse
import filecmp
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from common import SKILL_ROOT, within

def _same_tree(source: Path, destination: Path) -> bool:
    if not destination.is_dir():
        return False
    comparison = filecmp.dircmp(source, destination, ignore=["__pycache__", "*.pyc"])
    return not (comparison.left_only or comparison.right_only or comparison.diff_files or comparison.funny_files) and all(_same_tree(source / d, destination / d) for d in comparison.common_dirs)

def _reject_source_symlinks(source: Path) -> None:
    for current, dirs, files in os.walk(source, topdown=True, followlinks=False):
        for name in dirs + files:
            if (Path(current) / name).is_symlink():
                raise ValueError("Skill source contains a symlink; refusing to copy linked content")

def install(scope: str, target: str | None = None, dry_run: bool = False, force: bool = False) -> tuple[str, str | None]:
    source = SKILL_ROOT.resolve()
    _reject_source_symlinks(source)
    if scope == "workspace":
        if not target:
            raise ValueError("--target is required for workspace installation")
        root = Path(target).expanduser().resolve(strict=True)
        if not root.is_dir():
            raise ValueError(f"Target is not a directory: {root}")
        destination = root / ".agents" / "skills" / source.name
        if not within(destination, root):
            raise ValueError("Destination resolves outside the selected target (symlink escape)")
        boundary = root
    elif scope == "global":
        if target:
            raise ValueError("--target is only valid with --scope workspace")
        destination = Path.home() / ".gemini" / "config" / "skills" / source.name
        base = Path.home() / ".gemini" / "config"
        if not within(destination, base):
            raise ValueError("Global skill path resolves outside ~/.gemini/config (symlink escape)")
        boundary = base
    else:
        raise ValueError("Scope must be workspace or global")
    backup = None
    if destination.exists():
        if _same_tree(source, destination):
            return str(destination), None
        if not force:
            raise FileExistsError(f"Installation already exists and differs: {destination}. Review it or pass --force to create a backup and replace it.")
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = destination.with_name(destination.name + ".backup-" + stamp)
        if backup_path.exists():
            raise FileExistsError(f"Backup destination already exists: {backup_path}")
        backup = str(backup_path)
    if dry_run:
        return str(destination), backup
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not within(destination, boundary):
        raise ValueError("Destination changed during validation; refusing write")
    staging_root = Path(tempfile.mkdtemp(prefix=".ade-install-", dir=destination.parent))
    staged_skill = staging_root / source.name
    try:
        shutil.copytree(source, staged_skill, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        if destination.exists():
            if not backup:
                raise FileExistsError(f"Installation appeared during copy; refusing to overwrite: {destination}")
            shutil.move(str(destination), backup)
        try:
            shutil.move(str(staged_skill), str(destination))
        except Exception:
            if destination.exists() and within(destination, boundary):
                shutil.rmtree(destination)
            if backup and Path(backup).exists() and not destination.exists():
                shutil.move(backup, destination)
            raise
    except Exception:
        raise
    finally:
        if staging_root.exists() and within(staging_root, destination.parent):
            shutil.rmtree(staging_root, ignore_errors=True)
    return str(destination), backup

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, epilog="Refuses differing existing installs unless --force; forced upgrades preserve a timestamped backup.")
    parser.add_argument("--scope", choices=("workspace", "global"), required=True, help="Installation scope")
    parser.add_argument("--target", help="Existing target project directory (workspace scope)")
    parser.add_argument("--dry-run", action="store_true", help="Preview destination without writing")
    parser.add_argument("--force", action="store_true", help="Back up and replace an existing differing installation")
    args = parser.parse_args(argv)
    try:
        dest, backup = install(args.scope, args.target, args.dry_run, args.force)
    except FileExistsError as exc:
        print(f"Conflict: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError) as exc:
        print(f"Install error: {exc}", file=sys.stderr)
        return 3
    action = "Would install" if args.dry_run else "Installed or already current"
    print(f"{action}: {dest}")
    if backup:
        print(f"Existing installation backup: {backup}")
    print("Open the target workspace in Antigravity and request architect-docs-engine (or use /architect-docs-engine where supported).")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
