# Audit rubric

Score categories total 100 points: structural completeness 15, evidence and anti-hallucination 20, contract/schema coherence 15, traceability 20, security and secret hygiene 15, usability/operations/accessibility 10, change hygiene 5. N/A earns no automatic points: exclude only when the category is technically inapplicable and explain why; redistribute nothing. The score measures the documented checks, not architecture readiness.

## Statuses and hard gates

- **PASS:** no finding from performed checks; human review still applies.
- **PASS_WITH_WARNINGS:** no mechanical blocker, but warnings or unresolved evidence need review.
- **BLOCKED:** required facts or decisions are unavailable for a meaningful readiness decision.
- **FAIL:** a hard failure is confirmed.

Hard fails include a missing canonical doc, exposed secret, fabricated verified test/deployment/compliance claim, duplicate/dangling critical ID, destructive unapproved overwrite, broken required command, or production design stated as fact without evidence. Report exactly which checks ran, findings, and reproducible commands. Never infer production readiness from a high score or 21 files existing.

Mechanical checks can assess names, headings, links, ID integrity, explicit N/A reasons, common filler and secret patterns. Evidence quality, threat coverage, architecture suitability, accessibility, feasibility and stakeholder acceptance require a human/agent review against source material.
