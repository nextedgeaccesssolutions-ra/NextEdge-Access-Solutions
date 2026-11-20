# NEAS website + Online Store (Vercel)

Standalone Next.js app for the NEAS homepage, online store, customer accounts and admin panel.

## Rybbit analytics integration

The Admin panel includes a server-side Rybbit analytics proxy. The browser calls only `/api/admin/rybbit`; the route verifies the existing NEAS admin session and calls Rybbit with a server-side Bearer token. The API key is never returned to the browser.

Set these Vercel environment variables for Production (and Preview only if required):

- `RYBBIT_BASE_URL`: `https://analytics.nextedge-access-solutions.com`
- `RYBBIT_SITE_ID`: Site ID from the Rybbit site dashboard/API Playground.
- `RYBBIT_API_KEY`: Organization API key with only `analytics:read` scope. Create under Rybbit Settings → Organization → Organization API Keys.

Mark the key as Sensitive in Vercel and redeploy. Then open NEAS Admin → Analytics → Connect to Rybbit. It loads the last 30 days of overview metrics.

Never prefix the key with `NEXT_PUBLIC_`, commit it to Git, or place it in client-side code. Rybbit API documentation: https://rybbit.com/docs/api/getting-started and https://rybbit.com/docs/api/overview/overview.
