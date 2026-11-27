# NEAS APEX → Website CMS: Commercial Brief Intake

## Scope

The website accepts signed, verified commercial market briefs from NEAS APEX and creates a CMS page in **Pending Review**. It does not approve, schedule, publish, unpublish, edit, or delete content. The existing reviewer and publisher roles remain the only way to approve and publish a page.

Endpoint: `POST /api/integrations/giie/commercial-briefs`

## Required environment configuration

Set these as server-side Vercel environment variables for the website backend:

- `NEAS_GIIE_CMS_HMAC_SECRET`: random secret of at least 32 characters, shared only with the NEAS APEX server-side sender.
- `NEAS_GIIE_CMS_EDITOR_OPEN_ID`: openId of an existing CMS user whose role is `editor` (or `admin`). Do not create a publisher identity for this integration.
- `NEAS_GIIE_ALLOWED_SOURCE_HOSTS`: comma-separated exact hostnames approved by NEAS, for example `doe.gov.ph,erc.gov.ph`. Do not use wildcards.

No credentials belong in source control or browser code. Configure the same HMAC secret in NEAS APEX as `NEAS_CMS_HMAC_SECRET`; configure the endpoint as `NEAS_CMS_PUBLISH_URL` (the URL ends with the endpoint path).

## Request authentication

Headers:

- `X-NEAS-Timestamp`: Unix timestamp in seconds.
- `X-NEAS-Request-Id`: UUID.
- `X-NEAS-Signature`: lowercase hexadecimal HMAC-SHA256.

The signature is HMAC-SHA256 over:

```text
<timestamp>.<request-id>.<JSON.stringify(request-body)>
```

Requests expire after five minutes, are rate limited to 20 per minute, and have a 32 KB body limit. A deterministic slug derived from the GIIE signal ID makes retries idempotent. Existing pages are returned as duplicates and are never overwritten.

## Evidence and content policy

The endpoint requires a verified policy marker `neas-giie-commercial-v1`, at least two independent sources, HTTPS URLs, and exact source host matches against the configured allowlist. Each source must be marked official by the sender. The APEX side must only send content after its own verification and corroboration gates pass.

The integration renders structured text only; it accepts no HTML, scripts, media uploads, arbitrary slugs, CMS role fields, or publication state. The CMS records the configured editor as the author and creates a revision with a verification reminder.

## Response and workflow

A new brief returns HTTP 201 with `status: pending_review`. A repeated signal returns HTTP 200 with `duplicate: true` and its current CMS status.

Workflow remains:

`NEAS APEX verified brief → CMS Pending Review → human reviewer approval → authorized publisher publication`

The public site reads published pages only. This connector intentionally does not provide unattended public auto-publication.

## Rollout

1. Merge the website connector PR after review.
2. Configure the three website environment variables.
3. Configure the matching endpoint and HMAC secret in NEAS APEX.
4. Send a test brief using approved official sources.
5. Verify it appears in CMS as Pending Review and is not publicly visible.
6. Have a reviewer and publisher complete a controlled test.
7. Keep public auto-publication disabled unless a separately approved governance design is adopted.
