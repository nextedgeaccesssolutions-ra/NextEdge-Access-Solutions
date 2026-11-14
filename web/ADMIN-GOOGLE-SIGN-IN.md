# NEAS Admin Google Sign-In

## Required configuration

All three values can be set either as Vercel Production environment variables or in
Admin -> Marketing Command Center -> Settings & Logs. The hosting environment always wins;
a panel value is only used when the environment does not define one. Settings & Logs shows,
per key, whether a value is present and whether it came from `hosting` or `admin`.

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: the site's Google OAuth client.
- `ADMIN_GOOGLE_EMAILS`: comma-separated, lowercase Google email addresses authorized for Admin Panel SSO. Include only approved NEAS administrator accounts.

If any of the three is missing the flow redirects to `/admin/login?google_error=unavailable`
and the server log records which keys are absent (`[admin-google:start] not configured, missing: ...`).
The browser message stays generic on purpose.

Register this exact authorized redirect URI in the same Google OAuth client:

`https://www.nextedge-access-solutions.com/api/auth/admin/google/callback`

The customer Google login callback and social integration callbacks remain separate and unchanged.

## Security behavior

- Uses OAuth state, OIDC nonce, and PKCE (S256).
- Verifies Google's signed ID token, issuer, audience, nonce, and `email_verified`.
- Requires the normalized Google email to be in `ADMIN_GOOGLE_EMAILS`.
- Requires a matching pre-existing NEAS `users` record with role `admin`.
- Does not create users, link social identities, or promote roles.
- Creates the existing NEAS session only after every check passes.
- Preserves the email/password admin login.

## Rollout

Set `ADMIN_GOOGLE_EMAILS` and register the redirect URI before deploying this change. Test an allowlisted admin, a non-allowlisted Google account, an unverified email claim, state/nonce mismatch, and the existing password login. Deployment requires separate authorization.
