# NextEdge Access Solutions — NEAS Content Platform

Production-oriented corporate website, content management system, store/booking experience, lead capture, and controlled publishing platform for NextEdge Access Solutions.

## Current stack

- React 19 + Vite 7 frontend
- Express backend
- tRPC API layer
- Drizzle ORM + MySQL
- S3-compatible media storage
- OAuth/session authentication
- Tailwind CSS + Radix UI
- Vitest + TypeScript checks

The repository already contains the public homepage, CMS, admin workspace, store/booking flow, GitHub connector, database configuration, and deployment documentation. The frontend is rooted at `client/`; backend code is under `server/`. The current package build produces the Vite frontend in `dist/public` and bundles the Express server into `dist/`.

## Public experience

- `/` — NEAS corporate homepage
- `/store` and `/store-booking` — store and booking experience
- `/page/:slug` — CMS-managed public pages
- `/admin` — protected staff/CMS workspace
- `/github-connector` — GitHub integration workspace

The homepage includes service positioning, project content, resources, equipment/PPE information, direct contact CTAs, and lead/quote submission through the existing tRPC backend.

## CMS governance

Publishing is controlled through the workflow:

`Draft → Pending Review → Approved → Published`

Editors prepare content, reviewers approve/reject it, and publishers release approved content. Published content is separated from drafts, and rollback creates a new draft so production changes remain governed. See `ADMIN_GUIDE.md` for operating procedures.

## Vercel deployment

Vercel supports both Vite React deployments and Express applications, including Git-based preview deployments and production deployments. The NEAS deployment notes document the current Vercel projects, domain routing, store subdomain, and managed backend relationship.

Before changing production routing, review `deployment-notes.md`. Do not remove or replace existing backend proxy behavior without verifying database, OAuth, CMS, scheduled publishing, media, and form dependencies.

## Development

```bash
pnpm install
pnpm dev
```

Validation:

```bash
pnpm check
pnpm test
pnpm build
```

Database migration/push workflow:

```bash
pnpm db:push
```

Required environment variables are environment-specific and must be supplied through the deployment environment; never commit secrets to GitHub.

## Production principles

1. Preserve working CMS and backend functionality before refactoring.
2. Never expose credentials, database URLs, OAuth secrets, or storage keys in source control.
3. AI-generated website changes must follow preview/review/approval controls before publication.
4. Treat customer/contact submissions as confidential.
5. Test mobile, desktop, accessibility, SEO metadata, forms, authentication, CMS publishing, and rollback before production promotion.

## Deployment references

- Main domain: `https://www.nextedge-access-solutions.com/`
- Store: `https://store.nextedge-access-solutions.com/`
- Repository: `nextedgeaccesssolutions-ra/NextEdge-Access-Solutions`

See `deployment-notes.md` for the latest documented infrastructure state.
