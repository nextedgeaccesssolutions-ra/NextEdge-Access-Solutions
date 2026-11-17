# NEAS AI Workforce — Google Workspace / Gmail production integration

The NEAS AI Workforce connects two independently authorized Google mailboxes:

- **NEAS Information** — `info.nextedgeaccesssolutions@gmail.com`
- **NEAS Operations** — `nextedgeaccesssolutions@gmail.com`

## OAuth client and production callback

Use a Google OAuth 2.0 **Web application** client in project `neas-513807`. Enable the Gmail API. Add this exact production Authorized redirect URI:

```
https://www.nextedge-access-solutions.com/api/admin/gmail/callback
```

The connector requests `openid`, `email`, `profile`, `gmail.readonly`, and `gmail.compose`. Google documents `gmail.compose` as permitting draft management AND sending. NEAS uses this already-requested scope for sending only after Google verification is granted and BOTH `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED=true` and `NEAS_GMAIL_SEND_ENABLED=true` are explicitly set. No broader Gmail scope is added.

## Vercel environment

Configure these on the intended Vercel project:

- `GOOGLE_CLIENT_ID` — OAuth web client ID
- `GOOGLE_CLIENT_SECRET` — OAuth web client secret
- `TOKEN_ENCRYPTION_KEY` — dedicated 32-byte key encoded as exactly 64 hexadecimal characters
- `SITE_URL` — `https://www.nextedge-access-solutions.com`
- `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED` — leave unset/false until Google has approved the restricted `gmail.compose` scope
- `NEAS_GMAIL_SEND_ENABLED` — leave unset/false until mailbox scope grants, recipient allowlist, audit and test checks are complete
- `NEAS_GMAIL_APPROVED_RECIPIENTS` — comma-separated exact recipient addresses with documented permission/consent; no wildcard support
- `NEAS_GMAIL_DAILY_SEND_LIMIT` — optional per-mailbox rolling 24-hour cap (default 20, maximum 50)

Do not reuse `SESSION_SECRET`, `CONFIG_ENCRYPTION_KEY`, or database credentials as the token encryption key. Set secrets directly in Vercel; never commit them or paste them into chat. Do not rotate `TOKEN_ENCRYPTION_KEY` without a planned token migration.

## Database and security

The application idempotently creates:

- `aiw_gmail_accounts` — one encrypted OAuth grant per mailbox.
- `aiw_gmail_audit` — metadata-only audit events; message bodies and access/refresh tokens are never written to this log.
- `aiw_gmail_policy` — singleton policy row with `automatic_send_enabled = false` by default.

OAuth tokens use the existing versioned AES-256-GCM helper. Refresh tokens are stored encrypted; access tokens are refreshed server-side and re-encrypted. Access is restricted to authenticated NEAS administrators. The callback verifies OAuth state, checks the verified Google profile email against the mailbox identity, requires a refresh token, validates the required Gmail scopes, and records an audit event.

## Available admin APIs

All endpoints require a NEAS administrator session:

Outbound sending is implemented as a fail-closed, administrator-only endpoint at `POST /api/admin/gmail/send`. It accepts only fixed NEAS templates (quotation follow-up and training information), requires a unique Idempotency-Key, exact recipient allowlisting, the Gmail send scope in the mailbox grant, both explicit activation flags, and a per-mailbox rolling 24-hour send cap. Every blocked, failed, or successful attempt is recorded in `aiw_gmail_send_audit`; tokens remain AES-256-GCM encrypted and mailbox grants remain separate. The endpoint does not accept arbitrary HTML or free-form message bodies. Sending is OFF by default and cannot work until Google has approved `gmail.compose`, both mailboxes have been re-authorized with that scope, recipients are allowlisted, and NEAS explicitly enables the two activation flags. The implementation does not claim Google approval or mailbox connection. A background inbox poller, lead extraction, reply-draft generation, refresh-token health monitoring, and 24/7 processing schedule remain separate work.
