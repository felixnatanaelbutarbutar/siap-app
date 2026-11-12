"""Validate this skill's directory, frontmatter, entry points and local references."""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

from common import SKILL_ROOT, emit

REQUIRED = ["SKILL.md", "references/operating-modes.md", "references/documentation-blueprints.md",
            "references/evidence-and-assumptions.md", "references/traceability-and-ids.md", "references/audit-rubric.md",
            "references/design-and-accessibility.md", "references/ux-interaction-patterns.md", "references/security-and-abuse-resistance.md",
            "references/agentic-ai-extensions.md", "references/safe-updates.md",
            "assets/docs-manifest.json", "assets/config.schema.json", "assets/example-config.json", "scripts/cli.py",
            "scripts/install.py", "scripts/scan_workspace.py", "scripts/validate_skill.py", "scripts/validate_docs.py",
            "scripts/check_traceability.py", "scripts/report_audit.py"]
REQUIRED.append("scripts/validate_config.py")
REQUIRED.append("scripts/snapshot_workspace.py")

def validate_skill(root: Path = SKILL_ROOT) -> dict[str, Any]:
    findings = []
    if root.name != "architect-docs-engine":
        findings.append({"severity": "ERROR", "message": f"Unexpected skill directory name: {root.name}"})
    for rel in REQUIRED:
        path = root / rel
        if not path.is_file():
            findings.append({"severity": "ERROR", "message": f"Missing required resource: {rel}"})
    skill_md = root / "SKILL.md"
    if skill_md.is_file():
        text = skill_md.read_text(encoding="utf-8")
        match = re.match(r"\A---\s*\n(.*?)\n---\s*\n", text, re.S)
        if not match:
            findings.append({"severity": "ERROR", "message": "SKILL.md is missing YAML frontmatter"})
        else:
            front = match.group(1)
            name_match = re.search(r"(?m)^name:\s*([^\r\n]+)\s*$", front)
            description_match = re.search(r"(?m)^description:\s*([^\r\n]*)\s*$", front)
            top_keys = re.findall(r"(?m)^([A-Za-z][A-Za-z0-9-]*):", front)
            for key in sorted(set(top_keys) - {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}):
                findings.append({"severity":"ERROR","message":f"Unsupported frontmatter field: {key}"})
            name = name_match.group(1).strip().strip("'\"") if name_match else ""
            valid_name = bool(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name)) and len(name) <= 64
            if not valid_name or name != root.name:
                findings.append({"severity": "ERROR", "message": "Frontmatter name must be architect-docs-engine"})
            if not description_match:
                findings.append({"severity": "ERROR", "message": "Frontmatter description is required"})
            else:
                desc_value = description_match.group(1).strip()
                front_lines = front.splitlines()
                desc_index = next(i for i, line in enumerate(front_lines) if line.startswith("description:"))
                if desc_value in {">-", ">", "|-", "|"}:
                    desc_lines = []
                    for line in front_lines[desc_index + 1:]:
                        if line and not line[0].isspace():
                            break
                        if line.strip():
                            desc_lines.append(line.strip())
                    desc_value = " ".join(desc_lines)
                else:
                    desc_value = desc_value.strip("'\"")
                if not desc_value or len(desc_value) > 1024:
                    findings.append({"severity":"ERROR","message":"Frontmatter description must contain 1–1024 characters"})
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#")):
                continue
            path = (root / target.split("#", 1)[0]).resolve()
            try:
                path.relative_to(root.resolve())
            except ValueError:
                findings.append({"severity": "ERROR", "message": f"SKILL.md reference escapes skill directory: {target}"})
                continue
            if not path.is_file():
                findings.append({"severity": "ERROR", "message": f"Broken SKILL.md reference: {target}"})
    try:
        from common import load_manifest
        manifest = load_manifest()
        documents = manifest.get("documents", [])
        names = [item.get("file") for item in documents]
        if len(names) != 21 or len(set(names)) != 21:
            findings.append({"severity": "ERROR", "message": "Documentation manifest must define exactly 21 unique files"})
        for index, name in enumerate(names, 1):
            template = root / "assets" / "templates" / f"{index:02d}-{name.replace('.md', '')}.md.tmpl"
            if not template.is_file():
                findings.append({"severity": "ERROR", "message": f"Missing template for {name}: {template.relative_to(root).as_posix()}"})
    except (OSError, ValueError, KeyError, TypeError) as exc:
        findings.append({"severity": "ERROR", "message": f"Cannot validate docs manifest: {exc}"})
    result = {"skill_root": str(root), "status": "FAIL" if findings else "PASS", "findings": findings,
              "ok": not findings, "summary": f"Skill validation: {'FAIL' if findings else 'PASS'}; {len(findings)} finding(s)."}
    return result

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print machine-readable results")
    args = parser.parse_args(argv)
    result = validate_skill()
    emit(result, args.json)
    return 0 if result["ok"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
