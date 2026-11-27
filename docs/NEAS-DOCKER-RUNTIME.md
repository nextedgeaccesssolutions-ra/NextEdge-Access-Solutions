# NEAS Website Docker Runtime

This image packages the existing Express/Vite website application. It is intended for reproducible local and staging validation. It does not deploy the image, run database migrations, or publish CMS content.

## Build and run locally

```bash
docker build --pull -t neas-website:local .
docker run --rm -p 3000:3000 --env-file .env.docker neas-website:local
```

Create `.env.docker` locally using the environment variable names documented by the application. Never commit real credentials. The container runs as the unprivileged `node` user and listens on port 3000.

## GIIE CMS intake

The existing `/api/integrations/giie/commercial-briefs` endpoint is a private, signed intake route. Keep these controls enabled:

- HMAC-SHA256 signature verification, timestamp window and request ID validation.
- Exact schema validation and HTTPS source checks.
- Configured allowlist of official evidence hosts.
- Idempotent signal-to-page mapping.
- CMS status set to `pending_review` only.

The APEX bridge and website intake must use the same high-entropy HMAC secret, stored as server-only secrets in each runtime. Configure the editor identity and source allowlist only in a later approved staging setup. Do not expose secrets to browser code.

## Database and publishing boundary

- Do not run `db:push`, migrations or schema changes from the Docker image entrypoint.
- Supply database connectivity only through a private network and least-privilege credentials.
- Do not expose database ports publicly.
- A submitted page remains Pending Review. Public release requires the existing human review and authorized publisher workflow.

## Operational boundary

This PR adds a container build definition and documentation only. It does not start containers, create cloud resources, change production secrets, migrate databases, merge code, deploy production, or publish content.
