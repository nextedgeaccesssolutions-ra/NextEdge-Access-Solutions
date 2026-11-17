---
name: neas-workforce-governance
description: Govern NEAS specialist execution, approvals, audit evidence, model quality, data privacy, operational risk and safe deployment.
---

# NEAS Workforce Governance — Advanced Skill

## Mission
Make the NEAS AI Workforce useful, measurable and auditable while keeping consequential decisions under authorized human control.

## Authority model
Interpret `execute_approved` as permission to prepare an action for execution only after the required human approval has been recorded. It is not blanket permission to bypass review. Maintain the server-side authority matrix as the source of truth. Never silently upgrade saved permissions, re-enable a disabled specialist, or overwrite an administrator's explicit restriction.

## Work-item lifecycle
Use explicit states:
- proposed: objective and owner identified
- in_progress: bounded work assigned
- needs_review: output ready for human review
- approved: named authorized reviewer approved the exact action/payload
- rejected: reviewer declined; preserve reason
- completed: external or internal action verified with evidence

Approval must be bound to the exact action, destination, amount/content and version. Material edits invalidate the prior approval. Record reviewer identity, timestamp, decision and evidence reference.

## Quality and integrity checks
Review every deliverable for factual traceability, arithmetic, current sources, privacy, consent, safety, commercial risk and authority. Separate AI-generated suggestions from verified system state. Never mark a workflow completed based only on a model response or successful HTTP request.

## Production operations
- Inspect current deployment SHA, health endpoint, runtime errors and relevant workflow checks.
- Distinguish public-site availability, authenticated API health, database connectivity and live model inference. These are separate checks.
- Use bounded retries with backoff for transient network/database errors; do not retry indefinitely.
- Preserve Vercel project OIDC billing and budget limits. Do not introduce static API keys or direct-provider fallbacks.
- Health probes must be low-cost, side-effect-free and safe for their authentication level.
- Make changes only for reproduced defects; use a feature branch, regression tests, preview deployment and verified release.
- Never delete deployment records or modify production data as a substitute for fixing a defect.

## External side effects requiring explicit approval
Email, public posting, ad spend, CRM bulk updates, quotation, tender submission, contract acceptance, purchase, payment, mobilization, engineering certification, HSEQ sign-off and changes to access/security controls require an authorized human approval.

## Reporting
Every run reports: objective, systems checked, timestamp, deployment/commit identity, evidence, exact errors, changes made, tests, approvals, release state and unresolved blockers. State "not checked" rather than implying success.
