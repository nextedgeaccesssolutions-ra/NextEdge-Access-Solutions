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

The connector requests only these scopes:

- `openid`, `email`, `profile` — identify the administrator-authorized Google account.
- `https://www.googleapis.com/auth/gmail.metadata` — list message headers, dates, and labels for the authorized mailbox without reading message bodies (**restricted scope**).
- `https://www.googleapis.com/auth/gmail.compose` — create and manage drafts; this scope also permits sending, but NEAS production sending remains disabled behind independent controls (**restricted scope**).

The implementation does **not** request `gmail.readonly` or a separate `gmail.send` scope. The metadata scope is intentionally narrower than full mailbox read access and matches the inbox implementation, which requests message metadata only. Do not broaden the requested scopes unless the product features and privacy disclosures are updated first.

Google review is required for sensitive/restricted scopes where no exception applies. The requested Gmail scopes are restricted. Because NEAS accesses restricted Gmail data through its servers, Google may require restricted-scope verification and an approved security assessment (such as CASA), with recurring assessment when applicable. Do not represent the app as verified until Google confirms approval in the Verification Center.

## Google verification scope justification

Use the following truthful, least-privilege explanations in the Google Verification Center:

- **Gmail metadata** — NEAS Information and NEAS Operations administrators need to see the sender, subject, date, and labels of incoming business emails to identify client enquiries, project correspondence, and operational messages and decide which item requires a response. The integration does not request message bodies, snippets, attachments, or mailbox settings.
- **Gmail compose** — Authorized NEAS administrators use the integration to prepare a draft in the selected mailbox for human review. The draft is stored by Gmail. Although the scope can permit sending, the NEAS send endpoint remains disabled by default and requires separate application and database controls. The production send feature must not be activated until Google verification and acceptance testing are complete.

Do not claim that NEAS only accesses metadata if the implementation later adds message-body, attachment, or full-message processing. Update the declared scopes and privacy disclosures before enabling any expanded data access.

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

The current send endpoint accepts a recipient, subject, and plain-text body. It does not implement the additional recipient allowlist, idempotency key, fixed-template restriction, or rolling daily send cap described in a future hardened-send design. Those safeguards must be implemented and tested before either sending control is enabled. Do not enable sending by changing environment variables or database policy as part of this release.

## Sending authority

Automatic email sending remains disabled until all of the following are independently confirmed:

1. Google has approved the exact production branding and requested scopes, including any required restricted-scope security assessment.
2. Both NEAS mailboxes have completed separate, verified OAuth grants.
3. Token refresh, inbox access, draft creation, failure handling, audit logging, recipient controls, and send safeguards pass production acceptance tests.
4. NEAS explicitly approves activation of the environment flag and database policy after the safeguards are implemented.

No background mailer or autonomous sending schedule is enabled. Draft creation is the active outbound workflow; humans remain responsible for reviewing and sending drafts until the separate activation criteria are met.

## Google verification evidence checklist

- Public homepage: `https://www.nextedge-access-solutions.com/`
- Public privacy policy: `https://www.nextedge-access-solutions.com/privacy-policy`
- Support/developer contact: `info.nextedgeaccesssolutions@gmail.com`
- Production redirect URI: `https://www.nextedge-access-solutions.com/api/admin/gmail/callback`
- Provide an unlisted demonstration video showing the English OAuth grant flow, displayed app name and client ID, and the in-product use of each requested scope.
- Explain why inbox metadata access is necessary for the NEAS Information and NEAS Operations workflows and why a narrower scope is insufficient.

The app is not considered Google-verified until the Google Auth Platform Verification Center reports approval.
