# Documentation blueprints

Use the manifest and matching template in `../assets/` as the filename and heading source of truth. Each full suite has exactly these 21 Markdown files under the target docs directory.

## Dependency order

`PRD` → `TECH_STACK` / `DECISIONS` → `DATA_MODEL` / `VALIDATION_RULES` → `API_CONTRACT` → `UI` / `UX` → `SECURITY` / `PROMPTS` / `SEED` → `IMPLEMENTATION` / `OPERATIONS` → `ACCEPTANCE` / `TESTING` → `TRACEABILITY` → `AGENTS` → `AUDIT` → `_CHANGELOG` → `_AUDIT_REPORT` → `README`.

Update dependent files when a source decision changes. Define source IDs in their canonical document: `REQ` and `NFR` in `PRD`; `ADR` in `DECISIONS`; `EP`/`TOOL` in `API_CONTRACT`; `MODEL` in `DATA_MODEL`; `UI` in `UI`; `FLOW` in `UX`; `US` in `ACCEPTANCE`; `TC`/`EVAL` in `TESTING`. Agent roles can be defined in `PRD` as `AGENT-###` when present. Reference IDs elsewhere without redefining them.

## Per-file content contract

1. **README.md:** three-sentence overview, scope/status, evidence-backed quick start, Mermaid context/flow, project map, glossary, links to the other 20 files.
2. **PRD.md:** problem evidence, users/jobs, scope, constraints, functional `REQ` and measurable `NFR`, dependencies, assumptions, milestones and open decisions.
3. **TECH_STACK.md:** observed stack separately from proposed choices, actual version evidence/policy, alternatives, support and upgrade risks.
4. **DECISIONS.md:** chronological ADRs with status, context, options, rationale, tradeoffs, evidence, affected docs and revisit triggers; new choices default to Proposed.
5. **DATA_MODEL.md:** actual entities/columns/types, keys, indexes, nullability, retention and migration evidence; otherwise explain why persistence is absent.
6. **VALIDATION_RULES.md:** grounded fields, type/requiredness/range, normalization, authority, safe errors and accessibility; no invented regex.
7. **API_CONTRACT.md:** real transport/interface inventory, IDs, payloads, auth, status/error matrix, compatibility, pagination/idempotency only when relevant.
8. **UI.md:** preserve existing system; define product-specific visual intent and rationale, semantic color/type/spacing tokens, task-specific layout, consistent purposeful iconography, responsive/component states, and a rendered visual review gate. Avoid unsupported decorative defaults and fabricated brand/data. Headless projects explain N/A.
9. **UX.md:** users, task flows, page/inline form placement by default, explicit limits on popup/modal forms, primary-view states, error/recovery and keyboard/screen-reader needs; document operator/CLI journeys for headless tools.
10. **AGENTS.md:** target repository map, observed commands/conventions, safe edit rules, secrets, verification, forbidden actions and definition of done.
11. **PROMPTS.md:** actual prompt registry/schema/trust/evaluation only for runtime AI; otherwise useful development/review patterns and explicit N/A.
12. **SECURITY.md:** evidence-based assets/trust boundaries, identity/object authorization, bot/abuse and resource limits, agent/tool controls where relevant, input/data/secrets, supply chain, verification, incident response and residual risks. Read the security reference; do not claim invulnerability or compliance without evidence.
13. **SEED.md:** synthetic deterministic fixtures, reset safety and production separation; otherwise test fixture generation.
14. **IMPLEMENTATION.md:** ordered atomic milestones, prerequisites, modules, test gates, reversibility and clear proposed/current status.
15. **TESTING.md:** actual commands and test evidence; `TC` cases with preconditions/action/expected result; tests remain Not run until run.
16. **ACCEPTANCE.md:** `US` jobs with Given/When/Then, edge/negative cases and honest sign-off state.
17. **TRACEABILITY.md:** many-to-many requirement/story/interface/model/UI/flow/test graph, justified N/A, unresolved edges and actual counts.
18. **OPERATIONS.md:** observed/proposed topology, real config, startup/health/deploy/rollback/backup/monitoring and incident steps; no fictional commands.
19. **AUDIT.md:** severity, weighted rubric, N/A handling, hard fails, human review and release readiness.
20. **_AUDIT_REPORT.md:** actual UTC run/revision evidence, commands/results, score, counts, risks, evidence gaps and remediation. Unrun checks are distinct from failures.
21. **_CHANGELOG.md:** real suite changes with semantic doc version/UTC event, affected files, IDs and evidence; do not invent past history.

## Links and diagrams

Use relative links between docs and headings. Check all local targets. Mermaid components and IDs must match the prose. Do not draw a database, cloud, external API, screen, or AI component that has no observed or clearly proposed status. A link to `../src/...` is acceptable evidence navigation when the path exists; docs-relative tool links must remain within the target project.
