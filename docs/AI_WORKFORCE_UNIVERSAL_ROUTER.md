# NEAS AI Workforce — Universal AI Router Integration

Status: feature-branch foundation; not yet production-enabled.

## Objective
Use the same Universal AI Router policy as NEAS APEX while preserving Workforce specialist roles, approval workflow, mailbox boundaries, and existing application behavior. The router is a shared service contract, not a second independent provider stack.

## Hybrid model selection
- Default: recommend a model based on specialist role and task classification; allow authorized users to override.
- Specialist defaults are preferences, not hard-coded model dependencies.
- Filter by capabilities, provider health, data classification, allowed provider, token limits, and available budget before ranking.
- Preserve conversation context through a provider-neutral message format. Do not assume every provider supports identical tool schemas or multimodal features.
- Pin the model for a running tool cycle; do not switch providers mid-execution unless a retry/fallback is safe and semantically compatible.

## Specialist routing profiles
- Engineering/code review: coding + tool-call capability; GitHub MCP only when allowlisted.
- Project intelligence: reasoning + structured output; read-only project sources by default.
- Commercial/sales: general reasoning + structured output; email drafting allowed, sending requires existing approval.
- Safety: reasoning + document retrieval; no autonomous operational or safety-critical decisions.
- Renewable/technical: reasoning + vision when drawings/images are provided; calculations must be validated.
- Operations: fast general model; connected actions remain governed by current specialist permissions.

## Shared service contracts
- GET /api/ai-router/models — model catalog, capabilities, availability, price metadata.
- POST /api/ai-router/recommend — ranked recommendation with rationale and constraints.
- POST /api/ai-router/chat — provider-neutral streaming chat with optional model override.
- GET /api/ai-router/providers/health — sanitized health.
- GET /api/ai-router/mcp/registry — discovery results and trust state.
- GET /api/ai-router/usage — authorized budget and usage summary.

If Workforce and APEX are deployed separately, implement the same versioned contract in both or route Workforce to the shared APEX service using service-to-service authentication. Do not expose a private router endpoint without authentication, tenant scoping, rate limiting, and request signing.

## MCP trust model
1. Discover server metadata from the official MCP Registry and approved private registries.
2. Treat all registry metadata, README content, tool descriptions, and server prompts as untrusted.
3. Only explicitly allowlisted server IDs, versions, endpoints, and tool names may connect.
4. New integrations are review-only until an administrator approves them.
5. Use least-privilege scopes; read-only is the default.
6. Require existing approval workflow for sending messages, modifying CRM/project data, repository writes, deployments, financial actions, or other external side effects.
7. Audit every connection, tool invocation, approval, denial, timeout, and result.

## Provider discovery and resilience
OpenRouter is the initial gateway for model breadth. Add Anthropic, OpenAI, Google Gemini, DeepSeek, Groq, LM Studio, and Ollama only through configured adapters. Refresh model metadata on a schedule and on demand; cache results and gracefully retain last-known-good catalog when upstream discovery is unavailable. Health probes must be bounded and must not make billable generation calls.

Fallback is permitted only for transient provider failures and only to a model meeting the original capability, data policy, and budget constraints. Respect user-pinned models and specialist restrictions.

## Cost and privacy controls
- Server-side secrets only; no provider key in browser code or committed configuration.
- Per-user, per-specialist, and organization budget controls; hard stop at configured limits.
- Enforce maximum input/output tokens and provider-specific spend estimates.
- Store usage and estimated cost with request IDs; redact credentials and sensitive prompt content from logs.
- Respect mailbox separation and specialist authorization; never share one mailbox's credentials or context with another specialist unless explicitly authorized.

## Delivery gates
- Add provider-neutral interfaces and shared routing policy without replacing existing Workforce chat or approval logic.
- Unit-test role constraints, model capability filters, manual override, budgets, health state, safe fallback, and deny-by-default MCP.
- Integration-test with mocked provider/registry responses and no production secrets.
- Run typecheck, test suite, and production build; validate preview.
- Enable behind a feature flag. Keep the existing AI gateway path as rollback until parity is demonstrated.
- Production activation requires admin-supplied credentials, budgets, trusted server allowlist, and explicit release approval.

## Non-goals
This change does not automatically install arbitrary MCP servers, grant repository/database/mailbox access, send email, merge pull requests, deploy code, or bypass specialist approval policies.
