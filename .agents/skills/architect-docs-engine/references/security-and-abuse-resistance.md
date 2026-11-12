# Security and abuse resistance

Use this guide for web/API, data, automation, and agentic-AI projects. It creates an evidence-backed security design and verification plan. It cannot make an application “unhackable,” replace implementation, or certify security. Never imply that a prompt, WAF, CAPTCHA, or checklist alone prevents compromise.

## Threat-model each actual system

Start from inspected components and data flows. List assets, user/agent/service identities, trust boundaries, entry points, external dependencies, and consequences. Include relevant abuse cases rather than pasting a generic checklist:

- account takeover, broken object/function authorization, tenant-to-tenant access, privilege escalation, session/CSRF issues, injection, unsafe upload, SSRF, secrets exposure, dependency compromise, and sensitive data in logs;
- automated abuse: credential stuffing, scraping, spam, enumeration, expensive endpoint abuse, repeated side effects, queue exhaustion, and denial of service;
- for agentic AI: direct and indirect prompt injection, poisoned retrieved content/memory, unsafe tool selection or arguments, excessive agency, delegated-identity confusion, output passed to code/queries, and cross-agent trust/protocol failures.

For each material threat document the protected asset, attack path, preventive/detective controls, verification case, owner/status if known, and residual risk. Use `Observed`, `Approved`, `Proposed`, `Unresolved`, or `Not applicable`; never treat a proposed control as already deployed. Do not select arbitrary rate thresholds or claim protection without implementation evidence.

## Identity and authorization

- Enforce authentication and authorization in a deterministic trusted service, not in model instructions or client UI. Default deny where access is restricted, and check every request, action, and object against the authenticated principal and current tenant.
- Never trust a client-supplied owner, tenant, role, or object identifier as proof of permission. Test horizontal and vertical privilege escalation and IDOR-style access with at least two users/tenants where those concepts apply.
- Specify role/attribute policy, session lifecycle, recovery, MFA or step-up requirements, and service identity only from evidence or as explicitly Proposed. Do not prescribe JWT, OAuth, or an identity provider without a project reason.
- If cookies are used, define `Secure`, `HttpOnly`, and `SameSite` behavior and CSRF defenses. Define CORS as an allowlist of actual origins; CORS is not authentication or authorization.
- Make authorization decisions for side effects server-side immediately before execution. Re-check important permissions when queued work runs; do not rely on authorization captured only when the job was enqueued.

## Bots, abuse, and resource limits

Use layered, risk-based controls matched to the route and business cost. Consider edge filtering/WAF where available, endpoint-specific throttles, per-account or per-tenant quotas, per-IP/ASN signals, reputation or anomaly signals, and application-level authorization. Network-source signals can be spoofed or distributed; trust forwarding headers only from configured proxy hops. IP-only limits do not stop distributed account abuse.

- For login and recovery, separately limit attempts against an account and attempts from a source/network so a distributed attack cannot evade a combined `(IP, account)` bucket. Avoid account-lockout rules that let an attacker deny service to a victim.
- Bound request body and upload sizes, pagination, concurrent work, queue depth, retries, timeouts, fan-out, and per-task/model/tool cost where applicable. Apply idempotency to retryable side effects and backpressure or circuit breaking to expensive dependencies.
- Define the response and recovery when a limit is reached, including a generic `429` where appropriate, safe retry behavior, monitoring, and an accessible legitimate-user path. Avoid revealing whether an account exists through different status, body, or timing behavior.
- Treat CAPTCHA or a challenge as an optional step-up signal, not a complete defense; account for accessibility, privacy, false positives, and users who cannot complete it. Do not impose one globally without a threat and user-impact rationale.
- Set threshold values only from traffic, threat, capacity, and cost evidence or clearly label them Proposed. Add tests for boundaries, bursts, concurrency, and distributed/account-focused abuse where applicable.

## Agentic AI and tool boundaries

Treat instructions and data as different trust classes in the design, while recognizing the model cannot reliably separate them merely because a prompt says so. Mark user content, web pages, documents, email, retrieved passages, tool output, and peer-agent messages as untrusted input. Prompt injection cannot be fully eliminated; reduce the damage it can cause.

- Give each agent the minimum tools, data scope, tenant scope, and operation rights required for its job. Use separate identities/scopes for agents with different privileges; do not silently inherit a user's broad session or another agent's credentials.
- Enforce permissions and policy outside the model. Expose allowlisted, purpose-specific tools with strict argument schemas and size/range limits; validate the caller, resource, tenant, and state for every call. Do not give a general agent unrestricted shell, database, browser, or network access by default.
- Put code execution and file operations in an isolated, disposable environment with explicit filesystem mounts, CPU/time/memory limits, and no ambient secrets. Restrict outbound network destinations and redirects/metadata access when network fetching is required.
- Treat model/tool output as untrusted. Parse against schemas, encode for the destination context, and prevent output from becoming executable code, SQL, shell, HTML, or authorization policy without deterministic validation.
- Require explicit user confirmation for high-impact or hard-to-reverse actions such as sending externally, deleting, spending, changing permissions, or publishing. Show the exact action, target, and material content/cost at confirmation time; do not let the model approve its own action.
- Scope memory and retrieval permissions to the user/tenant, preserve provenance, define retention/deletion, and test poisoned or unauthorized source documents. Record tool calls and decisions with redaction, and provide cancellation, limits, and a kill switch appropriate to the runtime.
- Test direct/indirect prompt injection, malicious tool output, argument tampering, permission escalation, cross-tenant leakage, recursive loops, resource exhaustion, and unsafe delegation. A prompt-hardening test alone is insufficient.

## Data, operations, and verification

Document data classification, collection minimization, encryption/key ownership where applicable, retention/deletion, backups, log redaction, audit events, dependency/source integrity, patching, alerting, incident owner, and recovery evidence. Never invent implementation, monitoring, or incident contacts. For unavailable facts state what evidence or decision is needed.

Build a verification matrix from the selected threats: unit/negative authorization tests, integration tests at trust boundaries, abuse/rate tests, secret and dependency checks, and scoped security review or penetration testing where appropriate. Record exact commands, environment, date, scope, and actual outcome. A clean documentation audit or passing unit suite is not a penetration test or security certification.

## Reference material

- [OWASP Application Security Verification Standard 5.0.0](https://asvs.owasp.org/) — web application and service verification requirements.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- [OWASP Bot Management and Anti-Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html).
- [OWASP GenAI Prompt Injection](https://genai.owasp.org/glossary/prompt-injection/) and [AI Threat Modeling](https://genai.owasp.org/glossary/ai-threat-modeling/).
- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) and [Agentic AI Threats and Mitigations](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/).

Sources checked 2026-10-29. Re-check relevant source guidance when doing a real security review; links do not imply a project conforms to those standards.
