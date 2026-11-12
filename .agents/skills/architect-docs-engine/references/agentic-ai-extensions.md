# Agentic AI, MCP and LLM extensions

Apply these checks only when the target actually uses or explicitly proposes the component. Keep the same 21 output docs; do not create a twenty-second file. Every proposal remains marked Proposed until approved. For detailed threat analysis, use [security and abuse resistance](security-and-abuse-resistance.md); prompts are not an authorization boundary.

| Concern | Canonical docs | Required details |
| --- | --- | --- |
| Agent roles/orchestration | PRD, DECISIONS, IMPLEMENTATION | Responsibilities, single/multi-agent rationale, planner/executor/reviewer boundaries, recursion/iteration limits, termination, approvals, compensation and workflow states |
| Tools/MCP | API_CONTRACT, VALIDATION_RULES, SECURITY | Tool owner, capability, input/output schema, identity, privileges, pre/postconditions, side effects, timeout, idempotency, retries, errors, sensitivity and user approval; actual MCP transport/surfaces only if observed |
| Prompts/LLMs | PROMPTS, TECH_STACK | Prompt version, provider/model only if known, configured parameters, budget/truncation/routing, structured output, trust boundaries, injection defenses, refusal/escalation and evaluations; never disclose a private system prompt without authorization |
| Memory/state | DATA_MODEL, SECURITY, OPERATIONS | Stored data/location/retention, tenant/session/task boundaries, summaries/retrieval, provenance/access, deletion, replay/checkpoint and audit events |
| RAG | DATA_MODEL, API_CONTRACT, TESTING | Source ownership/quality, ingestion, formats, chunk/version, embedding/store only if confirmed, permissions, citations, refresh/staleness and adversarial tests |
| Evaluation | TESTING, ACCEPTANCE, AUDIT | Golden tasks, schema/tool correctness, groundedness/citations, reliability, policy/safety, measured cost/latency and human review of stochastic outputs |
| Operational safety | OPERATIONS, SECURITY, AGENTS | Trace IDs, redacted events, budgets/caps, isolation, rate/circuit/retry behavior, permission enforcement, audit, rollback/compensation and kill switch |
| Agent UX | UX, UI, ACCEPTANCE | Approval previews, queued/running/success/failure, provenance/uncertainty, cancellation, takeover and partial recovery |

Define `AGENT-###`, `TOOL-###`, `PROMPT-###`, and `EVAL-###` only when those objects exist; canonical definitions belong in PRD, API_CONTRACT, PROMPTS and TESTING respectively. Traceability remains many-to-many.

Every tool must have a named owner, narrowly scoped identity, allowlisted capability, validated argument schema, explicit side effects, timeout/resource budget, and server-side authorization. Require user confirmation before high-impact external side effects. Treat prompt injection as a residual risk: isolate untrusted context, validate outputs, and ensure tool permissions limit impact even when the model follows malicious input. Do not rely on system-prompt secrecy or model refusal as the sole control.

For relevant APIs, include concrete payloads and status/error semantics (400/401/403/404/409/422/429/500 as applicable), pagination and idempotency rules. Choose RFC 9457 only when grounded or proposed. Discuss cookie/session flags and RBAC/ABAC only where relevant. Document exact database/ORM types and retention only from evidence. Never invent exact values silently.
