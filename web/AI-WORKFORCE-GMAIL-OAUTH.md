# NEAS AI Workforce — Google Workspace / Gmail integration

NEAS connects two separately authorized Google mailboxes:
- **NEAS Information** — `info.nextedgeaccesssolutions@gmail.com`
- **NEAS Operations** — `nextedgeaccesssolutions@gmail.com`

## Google Cloud configuration

Use a Google OAuth 2.0 Web application client in project `neas-513807`, enable the Gmail API, and register this production redirect URI:

```
https://www.nextedge-access-solutions.com/api/admin/gmail/callback
```

The application requests `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.metadata`, and `https://www.googleapis.com/auth/gmail.compose`. Gmail metadata is used to display sender, subject, date, and labels without retrieving message bodies. Gmail compose creates drafts and is capable of sending; NEAS sending is separately constrained as described below.

Both Gmail scopes are restricted scopes. Google must independently verify the app and may require a CASA security assessment because NEAS accesses restricted Gmail data through its servers. Do not claim the app is verified until the Google Auth Platform Verification Center confirms approval.

## OAuth and mailbox controls

- Each mailbox uses a separate OAuth grant and exact verified Google account identity.
- OAuth state is random, short-lived, stored in HTTP-only cookies, and checked with a timing-safe comparison.
- The callback requires a verified Google profile matching the mailbox address and a refresh token.
- Refresh tokens are encrypted at rest with the dedicated `TOKEN_ENCRYPTION_KEY` using the existing AES-256-GCM helper.
- Access is restricted to authenticated NEAS administrators.
- The audit trail records authorization, refresh, inbox, draft, and send outcomes without storing OAuth tokens or message bodies.

## Vercel environment

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — OAuth web client credentials.
- `TOKEN_ENCRYPTION_KEY` — dedicated 32-byte key encoded as exactly 64 hexadecimal characters.
- `SITE_URL` — `https://www.nextedge-access-solutions.com`.
- `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED` — leave unset/false until Google approves the restricted compose scope.
- `NEAS_GMAIL_AUTOMATIC_SEND_ENABLED` — leave unset/false until approval, mailbox reauthorization, acceptance tests, and explicit NEAS activation.
- `NEAS_GMAIL_SEND_ENABLED` — a second environment gate; leave unset/false until the same approval and activation criteria are met.
- `aiw_gmail_policy.automatic_send_enabled` — a separate database gate, default false; keep false until an authorized NEAS operator approves activation.
- `NEAS_GMAIL_APPROVED_RECIPIENTS` — exact recipient allowlist; no wildcard support.
- `NEAS_GMAIL_DAILY_SEND_LIMIT` — optional rolling 24-hour per-mailbox cap (default 20, maximum 50).

Never commit credentials or paste them into chat. Do not reuse `SESSION_SECRET`, `CONFIG_ENCRYPTION_KEY`, or database credentials as the token encryption key. Do not rotate the token key without a planned token migration.

## Admin endpoints

All endpoints require a NEAS administrator session:
- `GET /api/admin/gmail/inbox?account=info|operations&maxResults=20` — returns limited message metadata only.
- `POST /api/admin/gmail/drafts` — creates a Gmail draft for human review; it does not send the message.
- `GET /api/admin/gmail/audit` — returns recent metadata-only OAuth, refresh, inbox, and draft audit events.
- `POST /api/admin/gmail/send` — fixed NEAS templates only; requires same-origin request, unique idempotency key, explicit recipient allowlisting, verified mailbox grant, Google approval flag, NEAS activation flag, and per-mailbox rolling daily limit.

## Sending safety

Automatic sending is OFF by default. The send endpoint cannot send unless `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED=true`, `NEAS_GMAIL_AUTOMATIC_SEND_ENABLED=true`, `NEAS_GMAIL_SEND_ENABLED=true`, the database policy row is true, the mailbox has the required compose grant, and the recipient is on the exact allowlist. It only accepts fixed quotation-follow-up and training-information templates. Every blocked, failed, or successful attempt is recorded in `aiw_gmail_send_audit`. Do not enable these flags until Google approval and production acceptance tests are verified.

## Remaining operational scope

The integration provides mailbox authorization, metadata inbox access, draft creation, and controlled template sending. Background inbox polling, lead extraction, automated reply generation, refresh-token health monitoring, and a 24/7 processing schedule are separate features and must not be represented as operational until implemented and tested.
