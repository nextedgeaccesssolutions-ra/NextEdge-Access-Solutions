# NEAS AI Workforce — Gmail OAuth setup

The AI Workforce Gmail connector uses two independent Google OAuth grants:

- `info` → `info.nextedgeaccesssolutions@gmail.com`
- `operations` → `nextedgeaccesssolutions@gmail.com`

## Google Cloud configuration

Use a Google OAuth 2.0 **Web application** client. Enable the Gmail API and configure the OAuth consent screen. Add this exact production Authorized redirect URI:

```
https://www.nextedge-access-solutions.com/api/admin/gmail/callback
```

The connector requests `openid`, `email`, `profile`, `gmail.readonly`, and `gmail.compose`. Google documents `gmail.compose` as permitting draft management AND sending. NEAS uses this already-requested scope for sending only after Google verification is granted and BOTH `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED=true` and `NEAS_GMAIL_SEND_ENABLED=true` are explicitly set. No broader Gmail scope is added.

## Vercel environment

Configure the following on the intended Vercel project:

- `GOOGLE_CLIENT_ID` — OAuth web client ID
- `GOOGLE_CLIENT_SECRET` — OAuth web client secret
- `TOKEN_ENCRYPTION_KEY` — dedicated 32-byte key encoded as exactly 64 hexadecimal characters
- `SITE_URL` — `https://www.nextedge-access-solutions.com`
- `GOOGLE_GMAIL_COMPOSE_SCOPE_APPROVED` — leave unset/false until Google has approved the restricted `gmail.compose` scope
- `NEAS_GMAIL_SEND_ENABLED` — leave unset/false until mailbox scope grants, recipient allowlist, audit and test checks are complete
- `NEAS_GMAIL_APPROVED_RECIPIENTS` — comma-separated exact recipient addresses with documented permission/consent; no wildcard support
- `NEAS_GMAIL_DAILY_SEND_LIMIT` — optional per-mailbox rolling 24-hour cap (default 20, maximum 50)

Do not reuse `SESSION_SECRET`, `CONFIG_ENCRYPTION_KEY`, or database credentials as the token encryption key. Set secrets directly in Vercel; never commit them or paste them into chat.

## Database setup

The admin connection page and OAuth routes idempotently create `aiw_gmail_accounts` on first use. The same table is also included in the existing `web/scripts/migrate.mjs` migration for environments that run the full migration. OAuth tokens are encrypted at rest using the existing AES-256-GCM social-token encryption helper.

## Connect and verify

1. Sign in as a NEAS administrator.
2. Open `/admin/ai-workforce/email`.
3. Connect each mailbox separately and select the exact Google account shown.
4. Verify both rows show `connected` in the admin screen.
5. Verify Google consent granted the requested scopes and that a refresh token was stored.

The integration is not considered connected until the callback verifies the Google profile email matches the mailbox assigned to that connection. OAuth grants can be revoked in the Google Account security settings.

## Operational boundary

Outbound sending is implemented as a fail-closed, administrator-only endpoint at `POST /api/admin/gmail/send`. It accepts only fixed NEAS templates (quotation follow-up and training information), requires a unique Idempotency-Key, exact recipient allowlisting, the Gmail send scope in the mailbox grant, both explicit activation flags, and a per-mailbox rolling 24-hour send cap. Every blocked, failed, or successful attempt is recorded in `aiw_gmail_send_audit`; tokens remain AES-256-GCM encrypted and mailbox grants remain separate. The endpoint does not accept arbitrary HTML or free-form message bodies. Sending is OFF by default and cannot work until Google has approved `gmail.compose`, both mailboxes have been re-authorized with that scope, recipients are allowlisted, and NEAS explicitly enables the two activation flags. The implementation does not claim Google approval or mailbox connection. A background inbox poller, lead extraction, reply-draft generation, refresh-token health monitoring, and 24/7 processing schedule remain separate work.
