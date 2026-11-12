"""Shared constants and safe path helpers for Architect Docs Engine."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
DOCS_DIR = SKILL_ROOT / "assets"
MANIFEST_PATH = DOCS_DIR / "docs-manifest.json"

def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

def canonical_names() -> list[str]:
    return [item["file"] for item in load_manifest()["documents"]]

def within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except (ValueError, OSError):
        return False

def safe_project_path(value: str | Path, *, must_exist: bool = True) -> Path:
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = Path.cwd() / candidate
    resolved = candidate.resolve(strict=must_exist)
    if must_exist and (not resolved.exists() or not resolved.is_dir()):
        raise ValueError(f"Project path is not an existing directory: {candidate}")
    return resolved

def emit(payload: Any, as_json: bool = False) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    elif isinstance(payload, dict) and "summary" in payload:
        print(payload["summary"])
        for finding in payload.get("findings", []):
            print(f"- {finding.get('severity', 'INFO')}: {finding.get('message', finding)}")
    else:
        print(payload)

ID_RE = re.compile(r"\b([A-Z][A-Z0-9]{1,15}-\d{3,})\b")
SECRET_PATTERNS = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{16,}", re.IGNORECASE),
    re.compile(r"(?i)\b(?:api[_-]?key|secret|access[_-]?token)\s*[:=]\s*['\"]?(?!<|\{)[A-Za-z0-9_./+=-]{16,}"),
]

def detect_secrets(text: str) -> list[str]:
    labels = []
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            labels.append(pattern.pattern[:42])
    return labels
