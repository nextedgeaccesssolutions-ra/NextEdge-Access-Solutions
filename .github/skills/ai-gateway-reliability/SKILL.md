---
name: ai-gateway-reliability
description: Diagnose, test, and harden the NEAS AI Gateway runtime while preserving project OIDC billing, the US$10 monthly budget, response privacy, and human approval gates.
---

# NEAS AI Gateway Reliability & Runtime Diagnostics

## Mission
Keep the NEAS AI Workforce inference path reliable, observable, cost-controlled, and fail-closed. Diagnose the complete browser to NEAS API to Vercel Function OIDC to AI Gateway to model response path.

## Diagnostic sequence
1. Identify the failing boundary: browser fetch, same-origin admin API, Vercel Function runtime, OIDC authentication, Gateway HTTP response, provider/model, response parsing, or database persistence.
2. Capture only safe metadata: timestamp, deployment SHA, route, HTTP status, Gateway request ID, finish reason, model ID, and duration.
3. Never log or expose prompt text, model response bodies, OAuth/OIDC tokens, API keys, cookies, or customer data.
4. Distinguish authentication availability from a verified live inference request. A token being present is not proof that a model returned a usable answer.
5. Verify the model identifier against the live Vercel AI Gateway catalog before changing it.

## Model and budget controls
- Keep the NEAS project OIDC billing path.
- Preserve the US$10 monthly Gateway project budget.
- Do not add AI_GATEWAY_API_KEY, BYOK credentials, or direct-provider fallbacks.
- Use bounded timeouts and output-token limits. For reasoning models, reserve enough output budget for user-facing text because reasoning tokens may count against the same limit.
- Report budget exhaustion (HTTP 402), authentication errors (401/403), rate limits (429), provider failures, and network timeouts distinctly.
- Do not retry indefinitely or fan out requests to alternative models/providers without an approved routing policy.

## Response handling
- Normalize documented Chat Completions, Responses, Anthropic Messages, and Gemini content structures.
- Support nested text content blocks where documented.
- Return only user-facing answer text. Never use hidden reasoning as a substitute for an answer.
- If a 2xx response contains no answer, include safe diagnostic metadata such as finish reason, request ID, and reasoning-token usage when available.
- Never persist empty or malformed model output as a work order.

## Acceptance tests
- Project OIDC token is read only from the approved Vercel runtime context.
- Static Gateway API keys are rejected for this project workload.
- Successful model output is extracted from string, multipart, nested, and documented response formats.
- Empty text, output-token truncation, 401/403, 402, 429, and network timeouts fail closed.
- Browser network errors are translated into actionable messages without claiming an action succeeded.
- Admin health probes are authenticated, low-token, bounded, and side-effect-free.
- Specialist work orders are persisted as needs_review; external actions remain human-approved.

## Release
Use a feature branch, deterministic tests, GitHub Actions checks, a Vercel Preview deployment, and verified production deployment. Make only evidence-backed repairs. Do not describe inference as live until the authenticated production probe returns the expected sentinel and the result is independently verified.