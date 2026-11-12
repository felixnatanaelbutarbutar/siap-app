# Operating modes

The agent owns interpretation and prose. The local Python tools only inspect local files and run deterministic checks.

| Intent | Read | Write behavior |
| --- | --- | --- |
| Initialize | Config schema, evidence rules | Prepare optional config and plan; do not invent design choices |
| Inspect | Safe update rules | Read-only inventory and evidence register |
| Generate | Blueprints, traceability rules | Create the 21 missing docs; existing filenames require review/merge |
| Update | Safe updates, traceability rules | Compute impact and edit reviewed sections; preserve unrelated content |
| Audit | Audit rubric, evidence rules | Read-only checks and human evidence review |
| Repair | Audit rubric, safe updates | Propose minimal fix; preserve disputed or hand-authored sections |
| Plan | Blueprints | Report sequence, dependencies, uncertainties; no writes |
| Diff | Safe updates | Compare current and proposed sections; no writes |
| Dry-run | Safe updates | Preview paths and changes; no target writes |
| Help | This file and root README | Explain command and evidence limits |

## Sequence

1. Resolve target root and distinguish it from the skill repository.
2. Inventory relevant manifests, source, tests and current docs with bounded local reads.
3. Classify claims and contradictions with evidence paths.
4. Build the requirement and test ID registry, then many-to-many edges.
5. Write in dependency order from `PRD.md` through `README.md`.
6. Run mechanical checks and review factual claims; repair confirmed defects only.
7. Hand off paths, findings, exact commands, readiness gaps and requested review.

For an empty project, output can be structurally complete while design decisions remain `Proposed` or `Unresolved`. Do not hold unrelated documentation hostage to an unresolved optional technology choice.
