# Traceability and IDs

IDs are stable and globally unique by type. Define once in the canonical file: `REQ`/`NFR` in `PRD.md`, `ADR` in `DECISIONS.md`, `EP`/`TOOL` in `API_CONTRACT.md`, `MODEL` in `DATA_MODEL.md`, `UI` in `UI.md`, `FLOW` in `UX.md`, `US` in `ACCEPTANCE.md`, `TC`/`EVAL` in `TESTING.md`; define `AGENT` roles in `PRD.md` only when a project actually uses them. Use `PREFIX-001` onward. Never renumber; mark retired records deprecated.

Represent links as many-to-many edges. One requirement may map to multiple stories, tools, screens and tests; a CLI/background job may have no endpoint or screen. Put `N/A — <technical reason>` for an absent surface and explain it. A functional requirement needs an acceptance criterion and verification test, or a documented blocking reason. Every endpoint needs an API test; every UI screen needs a flow and applicable UI test; each model needs a domain need or an internal-use reason; each NFR needs a measurement method or open measurement requirement.

The checker parses actual ID tokens and canonical definitions, detects duplicate definitions and dangling references, and reports defined/referenced/orphaned/dangling/duplicate/N/A/unresolved/covered counts. Mentioning IDs in a table is not enough unless each referenced token resolves. Fix links without changing stable IDs.
