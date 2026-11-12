"""Validate the optional target-project configuration without third-party packages."""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

from common import emit, safe_project_path, within

def validate_config(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    path = root / "architect-docs.config.json"
    if not path.exists() and not path.is_symlink():
        return {"project_root": str(root), "present": False, "ok": True, "findings": [],
                "summary": "No optional config found; workspace evidence and user instructions remain the inputs."}
    findings = []
    if not within(path, root):
        return {"project_root":str(root),"present":True,"ok":False,
                "findings":[{"severity":"ERROR","message":"Config file resolves outside the selected project"}],
                "summary":"Configuration path escapes the selected project."}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        return {"project_root": str(root), "present": True, "ok": False,
                "findings": [{"severity": "ERROR", "message": f"Invalid UTF-8 JSON config: {exc}"}],
                "summary": "Configuration is invalid; fix JSON syntax before using these settings."}
    if not isinstance(data, dict):
        findings.append({"severity": "ERROR", "message": "Config root must be an object"})
        data = {}
    _keys(data, {"project", "tech_stack", "constraints", "requirements_sources", "security_classification", "features", "docs"}, "root", findings)
    project_cfg = data.get("project", {})
    if not isinstance(project_cfg, dict):
        findings.append({"severity": "ERROR", "message": "project must be an object"}); project_cfg = {}
    _keys(project_cfg, {"name", "summary", "domain", "documentation_language", "lifecycle", "target_users"}, "project", findings)
    for key, maxlen in (("name",120),("summary",2000),("domain",120)):
        if key in project_cfg and (not isinstance(project_cfg[key], str) or len(project_cfg[key]) > maxlen or (key == "name" and not project_cfg[key].strip())):
            findings.append({"severity":"ERROR","message":f"project.{key} must be a non-empty string within {maxlen} characters"})
    for key, allowed in (("documentation_language", {"en","id"}), ("lifecycle", {"greenfield","existing"})):
        if key in project_cfg and (not isinstance(project_cfg[key], str) or project_cfg[key] not in allowed):
            findings.append({"severity":"ERROR","message":f"project.{key} must be one of {sorted(allowed)}"})
    users = project_cfg.get("target_users", [])
    users_valid = isinstance(users, list) and len(users) <= 50 and all(isinstance(x, str) and x.strip() and len(x) <= 120 for x in users)
    if not users_valid or (len(set(users)) != len(users) if users_valid else False):
        findings.append({"severity":"ERROR","message":"project.target_users must be an array of up to 50 non-empty strings"})
    if "tech_stack" in data and not isinstance(data["tech_stack"], dict):
        findings.append({"severity":"ERROR","message":"tech_stack must be an object"})
    elif isinstance(data.get("tech_stack", {}), dict):
        stack = data.get("tech_stack", {})
        if len(stack) > 100:
            findings.append({"severity":"ERROR","message":"tech_stack may contain at most 100 entries"})
        for key, value in stack.items():
            valid_string = isinstance(value, str) and len(value) <= 200
            valid_list = isinstance(value, list) and len(value) <= 20 and all(isinstance(item, str) and len(item) <= 200 for item in value)
            if not isinstance(key, str) or not key or len(key) > 100 or not (valid_string or valid_list):
                findings.append({"severity":"ERROR","message":f"tech_stack.{key} must be a bounded string or array of bounded strings"})
    for key in ("constraints", "requirements_sources"):
        value = data.get(key, [])
        max_length = 1000 if key == "constraints" else 300
        if not isinstance(value, list) or len(value) > 100 or any(not isinstance(x, str) or not x.strip() or len(x) > max_length for x in value):
            findings.append({"severity":"ERROR","message":f"{key} must be an array of up to 100 bounded non-empty strings"})
    sources = data.get("requirements_sources", [])
    if isinstance(sources, list):
        for source in sources:
            if not isinstance(source, str):
                continue
            candidate = Path(source)
            if candidate.is_absolute() or os.path.splitdrive(source)[0] or "\\" in source or any(part == ".." for part in source.split("/")):
                findings.append({"severity":"ERROR","message":"requirements_sources entries must be project-relative paths without traversal"})
            elif not within(root / source, root):
                findings.append({"severity":"ERROR","message":f"requirements source resolves outside the project (symlink escape): {source}"})
    if "security_classification" in data and (not isinstance(data["security_classification"], str) or data["security_classification"] not in {"public","internal","confidential","restricted","unresolved"}):
        findings.append({"severity":"ERROR","message":"security_classification has an unsupported value"})
    features = data.get("features", {})
    if not isinstance(features, dict):
        findings.append({"severity":"ERROR","message":"features must be an object"}); features = {}
    _keys(features, {"api", "database", "ui", "ai"}, "features", findings)
    for key, val in features.items():
        if not isinstance(val, bool): findings.append({"severity":"ERROR","message":f"features.{key} must be boolean"})
    docs = data.get("docs", {})
    if not isinstance(docs, dict):
        findings.append({"severity":"ERROR","message":"docs must be an object"}); docs = {}
    _keys(docs, {"output_dir", "strict", "update_policy"}, "docs", findings)
    output_dir = docs.get("output_dir", "docs")
    if not isinstance(output_dir, str) or not output_dir or not re.fullmatch(r"[A-Za-z0-9._/-]+", output_dir) or "\\" in output_dir or output_dir.startswith("/") or re.match(r"^[A-Za-z]:", output_dir) or any(part == ".." for part in output_dir.split("/")):
        findings.append({"severity":"ERROR","message":"docs.output_dir must be a relative path confined to the target project"})
    elif not within(root / output_dir, root):
        findings.append({"severity":"ERROR","message":"docs.output_dir resolves outside the target project (symlink escape)"})
    if "strict" in docs and not isinstance(docs["strict"], bool):
        findings.append({"severity":"ERROR","message":"docs.strict must be boolean"})
    if not isinstance(docs.get("update_policy", "review"), str) or docs.get("update_policy", "review") not in {"review", "managed-regions"}:
        findings.append({"severity":"ERROR","message":"docs.update_policy must be review or managed-regions"})
    return {"project_root":str(root),"present":True,"ok":not findings,"findings":findings,
            "summary":f"Config validation: {'PASS' if not findings else 'FAIL'}; {len(findings)} finding(s)."}

def _keys(data: dict[str, Any], allowed: set[str], scope: str, findings: list[dict[str, Any]]) -> None:
    for key in sorted(set(data) - allowed): findings.append({"severity":"ERROR","message":f"Unknown {scope} config key: {key}"})

def main(argv: list[str] | None = None) -> int:
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--project",required=True); parser.add_argument("--json",action="store_true")
    args=parser.parse_args(argv)
    try: result=validate_config(args.project)
    except (OSError,ValueError) as exc: print(f"Read error: {exc}"); return 3
    emit(result,args.json); return 0 if result["ok"] else 1

if __name__ == "__main__": raise SystemExit(main())
