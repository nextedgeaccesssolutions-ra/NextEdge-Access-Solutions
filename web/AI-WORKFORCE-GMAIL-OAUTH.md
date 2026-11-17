# NEAS AI Workforce — Gmail OAuth setup

The AI Workforce Gmail connector uses two independent Google OAuth grants:

- `info` → `info.nextedgeaccesssolutions@gmail.com`
- `operations` → `nextedgeaccesssolutions@gmail.com`

## Google Cloud configuration

Use a Google OAuth 2.0 **Web application** client. Enable the Gmail API and configure the OAuth consent screen. Add this exact production Authorized redirect URI:

```
https://www.nextedge-access-solutions.com/api/admin/gmail/callback
```

The connector requests `openid`, `email`, `profile`, `gmail.readonly`, and `gmail.compose`. The application uses the refresh token to maintain access and creates drafts only. No send endpoint is provided by this integration.

## Vercel environment

Configure the following on the intended Vercel project:

- `GOOGLE_CLIENT_ID` — OAuth web client ID
- `GOOGLE_CLIENT_SECRET` — OAuth web client secret
- `TOKEN_ENCRYPTION_KEY` — dedicated 32-byte key encoded as exactly 64 hexadecimal characters
- `SITE_URL` — `https://www.nextedge-access-solutions.com`

Do not reuse `SESSION_SECRET`, `CONFIG_ENCRYPTION_KEY`, or database credentials as the token encryption key. Set secrets directly in Vercel; never commit them or paste them into chat.

## Database migration

Run the existing migration command in the `web` app after deployment:

```sh
npm run migrate
```

This creates `aiw_gmail_accounts`. OAuth tokens are encrypted at rest using the existing AES-256-GCM social-token encryption helper.

## Connect and verify

1. Sign in as a NEAS administrator.
2. Open `/admin/ai-workforce/email`.
3. Connect each mailbox separately and select the exact Google account shown.
4. Verify both rows show `connected` in the admin screen.
5. Verify Google consent granted the requested scopes and that a refresh token was stored.

The integration is not considered connected until the callback verifies the Google profile email matches the mailbox assigned to that connection. OAuth grants can be revoked in the Google Account security settings.

## Operational boundary

This change establishes secure account authorization and token storage only. It does **not** yet implement a background inbox poller, lead extraction, reply-draft generation from inbound messages, refresh-token health monitoring, or a 24/7 processing schedule. Those components must be implemented and tested before describing the workforce as continuously operational. Email sending remains disabled under the draft-only authority.
