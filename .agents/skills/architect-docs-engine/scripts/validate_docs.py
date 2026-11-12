"""Check a target project's exact 21-file suite, links and basic quality gates."""
from __future__ import annotations

import argparse
from itertools import islice
import re
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from common import canonical_names, detect_secrets, emit, load_manifest, safe_project_path, within

FILLER = re.compile(r"\b(?:TODO|TBD|Lorem ipsum|INSERT[_ ]HERE|PLACEHOLDER)\b", re.I)
UNVERIFIED_CLAIM = re.compile(r"(?i)\b(?:tests? passed|deployed successfully|certified compliant|production ready)\b")
MAX_DOC_BYTES = 2_000_000
MAX_DOC_FILES = 5000

def validate_docs(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    manifest = load_manifest()
    docs = root / "docs"
    findings: list[dict[str, Any]] = []
    if docs.exists() and not within(docs, root):
        finding = {"severity": "ERROR", "code": "docs_path_escape", "message": "docs directory resolves outside the selected project"}
        return {"project_root":str(root),"docs_dir":str(docs),"expected_documents":len(canonical_names()),"present_documents":0,
                "extra_markdown_documents":[],"score":0,"status":"FAIL","findings":[finding],"ok":False,
                "summary":"Documentation audit failed: docs directory escapes the selected project."}
    direct_paths = list(islice(docs.glob("*.md"), MAX_DOC_FILES + 1)) if docs.is_dir() else []
    markdown_paths = list(islice(docs.rglob("*.md"), MAX_DOC_FILES + 1)) if docs.is_dir() else []
    present = {p.name for p in direct_paths[:MAX_DOC_FILES]}
    required = set(canonical_names())
    if len(direct_paths) > MAX_DOC_FILES or len(markdown_paths) > MAX_DOC_FILES:
        findings.append({"severity":"ERROR","code":"docs_scan_limit","message":f"Markdown inventory exceeds the {MAX_DOC_FILES}-file audit bound"})
    for name in sorted(required - present):
        findings.append({"severity": "ERROR", "code": "missing_document", "message": f"Missing required document docs/{name}"})
    extras = []
    for path in markdown_paths:
        if not path.is_file():
            continue
        if not within(path, root):
            findings.append({"severity":"ERROR","code":"document_path_escape","message":f"Markdown path resolves outside the selected project: {path.relative_to(docs).as_posix()}"})
            continue
        relative = path.relative_to(docs).as_posix()
        if relative not in required:
            extras.append(relative)
    for relative in sorted(extras):
        findings.append({"severity": "ERROR", "code": "extra_markdown", "message": f"Unexpected Markdown file in suite: docs/{relative}"})
    heading_map = {item["file"]: item.get("required_headings", []) for item in manifest["documents"]}
    contents: dict[str, str] = {}
    for name in sorted(present & required):
        path = docs / name
        if path.exists() and not within(path, root):
            findings.append({"severity":"ERROR","code":"document_path_escape","message":f"docs/{name} resolves outside the selected project"})
            continue
        try:
            if path.stat().st_size > MAX_DOC_BYTES:
                findings.append({"severity":"ERROR","code":"oversized_document","message":f"docs/{name} exceeds the {MAX_DOC_BYTES}-byte audit limit"})
                continue
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            findings.append({"severity": "ERROR", "code": "unreadable", "message": f"Cannot read docs/{name} as UTF-8"})
            continue
        contents[name] = text
        for heading in heading_map[name]:
            if not _has_heading(text, heading):
                findings.append({"severity": "ERROR", "code": "missing_heading", "message": f"docs/{name} is missing heading: {heading}"})
        if FILLER.search(text):
            findings.append({"severity": "ERROR", "code": "template_residue", "message": f"Template filler found in docs/{name}"})
        if detect_secrets(text):
            findings.append({"severity": "ERROR", "code": "secret_like", "message": f"Secret-like value detected in docs/{name}; value omitted"})
        for line_no, line in enumerate(text.splitlines(), 1):
            if UNVERIFIED_CLAIM.search(line) and not re.search(r"(?i)\b(?:fixture|example|observed|evidence|verified|not run|not audited)\b", line):
                findings.append({"severity": "WARNING", "code": "provenance_review", "message": f"Review unqualified result claim at docs/{name}:{line_no}"})
        if re.search(r"\bN/?A\b", text, re.I):
            for line_no, line in enumerate(text.splitlines(), 1):
                if re.search(r"\bN/?A\b", line, re.I) and not re.search(r"(?i)\bN/?A\s*[—:-]\s*\S", line):
                    findings.append({"severity": "WARNING", "code": "na_without_reason", "message": f"Add a reason for N/A at docs/{name}:{line_no}"})
        _check_links(name, text, docs, root, contents, findings)
    # Resolve links after all documents have been read; the first pass above also records missing targets.
    for name, text in contents.items():
        _check_links(name, text, docs, root, contents, findings, anchors=True)
    errors = sum(f["severity"] == "ERROR" for f in findings)
    warnings = sum(f["severity"] == "WARNING" for f in findings)
    score = _score(required <= present and not (present - required), contents, findings)
    status = "FAIL" if errors else "PASS_WITH_WARNINGS" if warnings else "PASS"
    return {"project_root": str(root), "docs_dir": str(docs), "expected_documents": len(required),
            "present_documents": len(present & required), "extra_markdown_documents": sorted(extras),
            "score": score, "status": status, "findings": _dedupe(findings), "ok": errors == 0,
            "summary": f"Documentation audit: {status}; {len(present & required)}/{len(required)} required files, score {score}/100, {errors} errors and {warnings} warnings."}

def _has_heading(text: str, required: str) -> bool:
    key = re.sub(r"[^a-z0-9]+", " ", required.lower()).strip()
    for line in text.splitlines():
        if line.startswith("#"):
            actual = re.sub(r"[^a-z0-9]+", " ", line.lstrip("# ").lower()).strip()
            if actual == key:
                return True
    return False

def _check_links(source_name: str, text: str, docs: Path, root: Path, contents: dict[str, str], findings: list[dict[str, Any]], anchors: bool = False) -> None:
    for match in re.finditer(r"(?<!!)\[[^\]]*\]\(([^)]+)\)", text):
        target = match.group(1).strip().split()[0].strip("<>")
        if not target or target.startswith(("http://", "https://", "mailto:", "#")):
            if anchors and target.startswith("#") and not _anchor_exists(text, target[1:]):
                findings.append({"severity": "ERROR", "code": "broken_anchor", "message": f"Broken local anchor #{target[1:]} in docs/{source_name}"})
            continue
        path_text, _, anchor = target.partition("#")
        path = (docs / unquote(path_text)).resolve()
        try:
            path.relative_to(root.resolve())
        except ValueError:
            findings.append({"severity": "ERROR", "code": "link_escape", "message": f"Link escapes project directory in docs/{source_name}"})
            continue
        if not path.is_file():
            findings.append({"severity": "ERROR", "code": "broken_link", "message": f"Broken local link in docs/{source_name}: {path_text}"})
        elif anchors and anchor:
            linked_text = contents.get(path.name)
            if linked_text is not None and not _anchor_exists(linked_text, anchor):
                findings.append({"severity": "ERROR", "code": "broken_anchor", "message": f"Broken anchor #{anchor} in docs/{source_name} -> {path.name}"})

def _anchor_exists(text: str, anchor: str) -> bool:
    wanted = unquote(anchor).lower()
    for line in text.splitlines():
        if line.startswith("#"):
            slug = re.sub(r"[^\w -]", "", line.lstrip("# ").lower()).replace(" ", "-")
            if slug == wanted:
                return True
    return False

def _score(structure: bool, contents: dict[str, str], findings: list[dict[str, Any]]) -> int:
    # Fixed weights. A category earns points only from direct observable checks.
    score = 15 if structure else 0
    evidence_files = ["PRD.md", "TECH_STACK.md", "_AUDIT_REPORT.md"]
    evidence = sum(bool(re.search(r"(?i)\b(?:Observed|User-specified|Proposed|Unresolved|Not applicable|fixture)\b", contents.get(f, ""))) for f in evidence_files)
    score += round(20 * evidence / len(evidence_files))
    coherence_files = ["DATA_MODEL.md", "API_CONTRACT.md", "VALIDATION_RULES.md"]
    score += round(15 * sum(bool(contents.get(f, "").strip()) for f in coherence_files) / len(coherence_files))
    score += 20 if not any(f["code"] in {"dangling_id", "duplicate_id"} for f in findings) else 0
    score += 15 if not any(f["code"] == "secret_like" for f in findings) else 0
    score += 10 if all(contents.get(f, "").strip() for f in ("UX.md", "OPERATIONS.md", "TESTING.md")) else 0
    score += 5 if "_CHANGELOG.md" in contents and "Unreleased" in contents["_CHANGELOG.md"] else 0
    return min(100, score)

def _dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen, result = set(), []
    for item in items:
        key = (item["severity"], item.get("code"), item["message"])
        if key not in seen:
            seen.add(key); result.append(item)
    return result

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Existing target project directory")
    parser.add_argument("--json", action="store_true", help="Print machine-readable audit report")
    args = parser.parse_args(argv)
    try:
        result = validate_docs(args.project)
    except (OSError, ValueError) as exc:
        print(f"Read error: {exc}")
        return 3
    emit(result, args.json)
    return 0 if result["ok"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
