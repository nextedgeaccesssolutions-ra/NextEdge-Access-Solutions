# NEAS AI Workforce — Google Workspace / Gmail production integration

The NEAS AI Workforce connects two independently authorized Google mailboxes:

- **NEAS Information** — `info.nextedgeaccesssolutions@gmail.com`
- **NEAS Operations** — `nextedgeaccesssolutions@gmail.com`

## OAuth client and production callback

Use a Google OAuth 2.0 **Web application** client in project `neas-513807`. Enable the Gmail API. Add this exact production Authorized redirect URI:

```
https://www.nextedge-access-solutions.com/api/admin/gmail/callback
```

The OAuth callback uses the same canonical `SITE_URL` value for both authorization and token exchange. Do not register preview, localhost, or personal developer callback URLs on the production OAuth client.

## Requested scopes and verification

The connector requests:

- `openid`, `email`, `profile` — identify the administrator-authorized Google account.
- `https://www.googleapis.com/auth/gmail.metadata` — list message headers, dates, and labels for the authorized mailbox without reading message bodies (**restricted scope**).
- `https://www.googleapis.com/auth/gmail.compose` — create drafts and, if separately enabled in the future, send messages (**sensitive scope**).

Request only scopes required by the actual features. Google review is required for sensitive/restricted scopes where no exception applies. Because `gmail.readonly` allows restricted Gmail data to be accessed through NEAS servers, Google may require an independent Google-approved security assessment (CASA) and recurring reassessment. Do not represent the app as verified until Google confirms approval in the Verification Center.

## Vercel environment

Configure these on the intended Vercel project:

- `GOOGLE_CLIENT_ID` — OAuth web client ID
- `GOOGLE_CLIENT_SECRET` — OAuth web client secret
- `TOKEN_ENCRYPTION_KEY` — dedicated 32-byte key encoded as exactly 64 hexadecimal characters
- `SITE_URL` — `https://www.nextedge-access-solutions.com`
- `NEAS_GMAIL_AUTOMATIC_SEND_ENABLED` — leave unset or `false`

Do not reuse `SESSION_SECRET`, `CONFIG_ENCRYPTION_KEY`, or database credentials as the token encryption key. Set secrets directly in Vercel; never commit them or paste them into chat. Do not rotate `TOKEN_ENCRYPTION_KEY` without a planned token migration.

## Database and security

The application idempotently creates:

- `aiw_gmail_accounts` — one encrypted OAuth grant per mailbox.
- `aiw_gmail_audit` — metadata-only audit events; message bodies and access/refresh tokens are never written to this log.
- `aiw_gmail_policy` — singleton policy row with `automatic_send_enabled = false` by default.

OAuth tokens use the existing versioned AES-256-GCM helper. Refresh tokens are stored encrypted; access tokens are refreshed server-side and re-encrypted. Access is restricted to authenticated NEAS administrators. The callback verifies OAuth state, checks the verified Google profile email against the mailbox identity, requires a refresh token, validates the required Gmail scopes, and records an audit event.

## Available admin APIs

All endpoints require a NEAS administrator session:

- `GET /api/admin/gmail/inbox?account=info|operations&maxResults=20&q=` — returns limited inbox metadata. It does not persist message bodies.
- `POST /api/admin/gmail/drafts` — creates a Gmail draft. JSON body: `{ "account": "info", "to": "recipient@example.com", "subject": "...", "body": "..." }`.
- `POST /api/admin/gmail/send` — intentionally blocked by default. It requires **both** the Vercel environment flag `NEAS_GMAIL_AUTOMATIC_SEND_ENABLED=true` and the database policy row `automatic_send_enabled=true`. Neither gate is enabled by this implementation.

## Sending authority

Automatic email sending remains disabled until all of the following are independently confirmed:

1. Google has approved the exact production branding and scopes, including any restricted-scope security assessment.
2. Both NEAS mailboxes have completed separate, verified OAuth grants.
3. Token refresh, inbox access, draft creation, failure handling, and audit logging pass production acceptance tests.
4. NEAS explicitly approves activation of the environment flag and database policy.

No background mailer or autonomous sending schedule is enabled. Draft creation is the active outbound workflow; humans remain responsible for reviewing and sending drafts until the separate activation criteria are met.

## Google verification evidence checklist

- Public homepage: `https://www.nextedge-access-solutions.com/`
- Public privacy policy: `https://www.nextedge-access-solutions.com/privacy-policy`
- Support/developer contact: `info.nextedgeaccesssolutions@gmail.com`
- Production redirect URI: `https://www.nextedge-access-solutions.com/api/admin/gmail/callback`
- Provide an unlisted demonstration video showing the English OAuth grant flow, displayed app name and client ID, and the in-product use of each requested scope.
- Explain why inbox metadata access is necessary for the NEAS Information and NEAS Operations workflows and why a narrower scope is insufficient.

The app is not considered Google-verified until the Google Auth Platform Verification Center reports approval.
