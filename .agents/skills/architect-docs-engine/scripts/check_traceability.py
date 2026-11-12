"""Validate canonical ID definitions and cross-document references."""
from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from common import canonical_names, emit, safe_project_path, within

DEFINITION_DOCS = {"REQ": "PRD.md", "NFR": "PRD.md", "US": "ACCEPTANCE.md", "EP": "API_CONTRACT.md",
                   "ADR": "DECISIONS.md", "UI": "UI.md", "TC": "TESTING.md", "AGENT": "PRD.md",
                   "TOOL": "API_CONTRACT.md", "PROMPT": "PROMPTS.md", "EVAL": "TESTING.md", "MODEL": "DATA_MODEL.md", "FLOW": "UX.md"}
DEFINITION_LINE = re.compile(r"^\s*(?:#{1,6}\s+)?\*\*([A-Z][A-Z0-9]{1,15}-\d{3,})\*\*\s*(?:[—:-]|$)|^\s*\|\s*\*\*?([A-Z][A-Z0-9]{1,15}-\d{3,})\*\*?\s*\|", re.M)
TRACE_ID_RE = re.compile(r"\b(?:REQ|NFR|US|EP|ADR|UI|TC|AGENT|TOOL|PROMPT|EVAL|MODEL|FLOW)-\d{3,}\b")
MAX_DOC_BYTES = 2_000_000

def check_traceability(project: str | Path) -> dict[str, Any]:
    root = safe_project_path(project)
    docs = root / "docs"
    definitions: dict[str, list[str]] = defaultdict(list)
    references: dict[str, list[str]] = defaultdict(list)
    na_count = 0
    unresolved_count = 0
    misplaced: dict[str, list[str]] = defaultdict(list)
    findings: list[dict[str, Any]] = []
    if not docs.is_dir():
        return {"project_root": str(root), "counts": {"defined":0,"referenced":0,"orphaned":0,"dangling":0,"duplicate":0,"not_applicable":0,"unresolved":0,"covered":0},
                "definitions":{},"references":{},"orphaned_ids":[],"dangling_ids":{},"duplicate_ids":{},
                "findings":[{"severity":"ERROR","message":"Missing docs directory"}],"ok":False,
                "summary":"Traceability check failed: docs directory is missing."}
    if not within(docs, root):
        return {"project_root":str(root),"counts":{"defined":0,"referenced":0,"orphaned":0,"dangling":0,"duplicate":0,"not_applicable":0,"unresolved":0,"covered":0},
                "definitions":{},"references":{},"orphaned_ids":[],"dangling_ids":{},"duplicate_ids":{},
                "findings":[{"severity":"ERROR","message":"docs directory resolves outside the selected project"}],"ok":False,
                "summary":"Traceability check failed: docs directory escapes the selected project."}
    for filename in canonical_names():
        path = docs / filename
        if not path.is_file():
            continue
        if not within(path, root):
            findings.append({"severity":"ERROR","message":f"docs/{filename} resolves outside the selected project"})
            continue
        if path.stat().st_size > MAX_DOC_BYTES:
            findings.append({"severity":"ERROR","message":f"docs/{filename} exceeds the {MAX_DOC_BYTES}-byte traceability bound"})
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if re.search(r"\bN/?A\s*[—:-]\s*\S", text, re.I):
            na_count += len(re.findall(r"\bN/?A\s*[—:-]\s*\S", text, re.I))
        unresolved_count += len(re.findall(r"\bUnresolved\s*[—:-]", text, re.I))
        for match in TRACE_ID_RE.finditer(text):
            ident = match.group(0)
            line_start = text.rfind("\n", 0, match.start()) + 1
            line_end = text.find("\n", match.end())
            line = text[line_start: line_end if line_end >= 0 else len(text)]
            canonical = DEFINITION_DOCS.get(ident.split("-", 1)[0])
            declaration = next((d.group(1) or d.group(2) for d in DEFINITION_LINE.finditer(line) if (d.group(1) or d.group(2)) == ident), None)
            if declaration and canonical == filename:
                definitions[ident].append(filename)
            elif declaration:
                definitions[ident].append(filename)
                misplaced[ident].append(filename)
            else:
                references[ident].append(filename)
    duplicate = {ident: files for ident, files in definitions.items() if len(files) > 1}
    defined = set(definitions)
    referenced = set(references)
    dangling = {ident: sorted(set(files)) for ident, files in references.items() if ident not in defined}
    orphaned = sorted(defined - referenced)
    covered = sorted(ident for ident in defined if ident in referenced)
    for ident, files in duplicate.items():
        findings.append({"severity": "ERROR", "message": f"Duplicate definition {ident} in {', '.join(files)}"})
    for ident, files in misplaced.items():
        findings.append({"severity": "ERROR", "message": f"Definition {ident} must be in {DEFINITION_DOCS.get(ident.split('-', 1)[0], 'its canonical document')}; found in {', '.join(files)}"})
    for ident, files in dangling.items():
        findings.append({"severity": "ERROR", "message": f"Dangling reference {ident} in {', '.join(files)}"})
    for ident in orphaned:
        findings.append({"severity": "WARNING", "message": f"Defined ID {ident} is not referenced"})
    summary = {"defined": len(defined), "referenced": len(referenced), "orphaned": len(orphaned),
               "dangling": len(dangling), "duplicate": len(duplicate), "not_applicable": na_count,
               "unresolved": unresolved_count, "covered": len(covered)}
    return {"project_root": str(root), "counts": summary, "definitions": {k: v for k, v in sorted(definitions.items())},
            "references": {k: sorted(set(v)) for k, v in sorted(references.items())},
            "orphaned_ids": orphaned, "dangling_ids": dangling, "duplicate_ids": duplicate,
            "findings": findings, "ok": not any(f["severity"] == "ERROR" for f in findings),
            "summary": f"Traceability: {summary['defined']} defined IDs, {summary['referenced']} referenced; {summary['dangling']} dangling, {summary['duplicate']} duplicate."}

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Existing target project directory")
    parser.add_argument("--json", action="store_true", help="Print machine-readable results")
    args = parser.parse_args(argv)
    try:
        result = check_traceability(args.project)
    except (OSError, ValueError) as exc:
        print(f"Read error: {exc}")
        return 3
    emit(result, args.json)
    return 0 if result["ok"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
