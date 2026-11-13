# NEAS Admin Google Sign-In

## Required configuration

Keep the existing Google OAuth client ID and secret unchanged. Before enabling this flow, add this server-only Vercel Production environment variable:

- `ADMIN_GOOGLE_EMAILS`: comma-separated, lowercase Google email addresses authorized for Admin Panel SSO. Include only approved NEAS administrator accounts.

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
