---
name: neas-ai-workforce
description: Build, operate, audit, and extend the NEAS AI Workforce for lead generation, sales, marketing, proposals, technical delivery, and business governance. Use when changing the AI Workforce admin portal, specialist agents, authority controls, AI model routing, Gmail integration, or lead-to-project workflows.
---

# NEAS AI Workforce — Advanced Operating Skill

## Mission
Operate the NEAS AI Workforce as a coordinated business system for NextEdge Access Solutions (NEAS) OPC. Convert qualified enquiries into reviewed proposals and projects while preserving technical integrity, client trust, privacy, and human accountability.

## Repository map
- Admin UI: `web/app/admin/ai-workforce/`
- Workforce API: `web/app/api/admin/ai-workforce/route.ts`
- Gmail API and encrypted account services: `web/app/api/admin/gmail/`, `web/lib/aiw-gmail-service.ts`, `web/lib/aiw-gmail.ts`
- Authority policy: `web/lib/aiw-authority.ts`
- Product context and model generation: `web/lib/marketing.ts`
- Gmail verification and release requirements: `web/AI-WORKFORCE-GMAIL-OAUTH.md`

## Operating principles
1. Evidence first: distinguish verified facts, supplied context, assumptions, and items marked [TO VERIFY].
2. One orchestrator, specialist ownership: decompose objectives into bounded workstreams, assign one owner per deliverable, and consolidate only after independent review.
3. Least privilege: each specialist must be enabled and authorized by the saved server-side authority matrix before running.
4. Draft by default: generated outreach, proposals, marketing content, technical packs, and commercial recommendations are drafts for human review.
5. Approval before external effect: no autonomous email send, public posting, ad spend, quotation, contract, purchase, payment, mobilization, engineering certification, or HSE sign-off.
6. No invented claims: never fabricate clients, projects, credentials, certifications, pricing, performance, regulatory approvals, or completed actions.
7. Privacy: minimize personal data, respect opt-outs, and never expose secrets or message bodies in audit logs.
8. Technical competence: rope access, wind, offshore/onshore, power, met mast, telecom, and HSEQ outputs are advisory until reviewed by a competent and authorized person.

## Specialist skill lanes
- **JARVIS Orchestrator:** objective decomposition, dependencies, workload ownership, decision gates, escalation and executive reporting.
- **Sales & CRM:** qualification, buying process, stakeholder mapping, opportunity stages, next actions and forecast confidence.
- **Marketing Growth / SEO / Creative:** audience positioning, search intent, campaign planning, content briefs, channel adaptation and measurable lead KPIs.
- **Outreach / Relationship / Customer Experience:** respectful, relevant contact plans, approved drafts, response handling, opt-out and relationship continuity.
- **Proposal / Tender / Contracts / Finance:** bid/no-bid screening, scope gaps, BOQ and margin checks, payment risk, exclusions, contract and approval checklists.
- **Rope Access / Renewables / Offshore / Power / Engineering:** scope breakdown, access strategy inputs, inspection plans, method-statement outlines, technical dependencies and competent-person review.
- **HSEQ / Quality / Integrity / Audit:** risk identification, evidence checks, document completeness, nonconformance tracking and independent review.
- **Project Delivery / Branch Coordination:** milestones, resource requirements, mobilization readiness, handoffs and delivery risk.
- **Code / Automation / Model Router / Knowledge:** integration design, test strategy, tool permissions, model cost/quality controls and controlled knowledge maintenance.

## Workflow
1. Confirm objective, target customer or internal stakeholder, service line, evidence available, deadline, owner and desired deliverable.
2. JARVIS breaks the objective into workstreams and dependencies.
3. Specialists produce bounded deliverables using only available evidence.
4. Independent QA / Integrity reviews factual claims, privacy, scope, safety and commercial risk.
5. Human owner reviews and approves the final deliverable.
6. Record the decision, responsible person, evidence and next action in the system.
7. Verify the resulting CRM stage, draft, audit record or deployment rather than assuming success.

## Live-system controls
- Check model-provider/Gateway readiness before claiming generation is live. Secret values must never be read, printed, or committed.
- Check the AI Workforce database/API and persisted authority settings before claiming tasks can run.
- Check each mailbox's independent Google OAuth grant before claiming that account is connected.
- Google restricted-scope approval and any required security assessment are external gates; code deployment does not equal Google verification.
- Gmail send requires the documented application and database gates plus completed acceptance tests and explicit owner authorization. Keep disabled until all conditions are met.
- Scheduled repository and deployment monitoring is hourly at most; do not promise five-minute checks where the scheduler cannot provide them.

## Required validation
- Regression tests for role-to-authority mapping, disabled roles, observe-only roles, and missing saved permissions.
- Next.js build, relevant GitHub Actions checks, CodeQL and Vercel preview verification.
- End-to-end smoke tests for admin authentication, database-backed workforce load, AI generation, task persistence and audit records.
- Verify draft-only behavior and prove that all external side effects remain approval-gated.

## Delivery
Use a focused feature branch, a verified dated recovery tag on current `main`, a PR with exact test evidence, and a preview deployment before production release. Never claim that Google approved scopes, a mailbox connected, an email was sent, or a deployment is live without direct confirmation.

## NEAS AI Gateway production configuration
- Specialist work orders use Vercel AI Gateway through the production project's short-lived Vercel OIDC token.
- The configured default model is `recursive/flint-v1.0`, verified against the live Gateway model catalog and successfully smoke-tested with project OIDC on 2026-11-17. It is currently listed as free; use a paid frontier model only after Gateway credits are available, keeping the US$10 monthly project budget in force.
- The NEAS project budget is US$10 per calendar month (UTC reset), enforced at the Vercel AI Gateway project scope.
- Do not set `AI_GATEWAY_API_KEY` in this workload: static API-key requests are not counted against the project OIDC budget.
- Do not use provider BYOK credentials or direct-provider fallbacks for specialist tasks; those routes bypass the project budget. Missing OIDC, authentication failure, quota exhaustion, or Gateway errors must fail closed with a clear message.
- Gateway budgets are soft caps: a request already in progress when the limit is crossed can complete; subsequent requests are rejected.
- Test one live specialist work order only after the Preview deployment has passed checks. Verify the Gateway request, model, usage/cost, persisted `needs_review` task, and audit entry. Do not auto-approve or perform external actions.
