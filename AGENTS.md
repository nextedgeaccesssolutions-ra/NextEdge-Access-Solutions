# Repository Guidance

## Project

NEAS Content Platform is a React 19/Vite frontend with an Express backend, tRPC APIs, Drizzle ORM, and MySQL. The React app lives in `client/`, backend code in `server/`, shared types and constants in `shared/`, and a separate Next.js web app in `web/`. Database schema and migrations are in `drizzle/`.

The root package commands apply to the Vite/Express app. The independent Next.js app has its own `package.json` and `package-lock.json` under `web/`; its homepage template is `web/site/home.html`, served and enriched by `web/lib/homepage.ts`, and its public assets are in `web/public/`.

For product behavior, current routes, CMS governance, deployment details, and environment setup, consult `README.md`, `ADMIN_GUIDE.md`, `deployment-notes.md`, and `web/README.md` as appropriate.

## Commands

- Install dependencies: `pnpm install`
- Start the main development server: `pnpm dev`
- Type-check: `pnpm check`
- Run tests: `pnpm test`
- Build: `pnpm build`
- Generate and apply database migrations: `pnpm db:push`

For the Next.js app, run commands from `web/`: `npm run dev` starts development, and `npm run build:app` builds without a database migration. `npm run build` and `npm run migrate` execute `web/scripts/migrate.mjs`, which creates/updates tables and may seed data or bootstrap an admin when configured with database credentials. Do not run these commands against a live or unknown database without explicit authorization.

Run the narrowest relevant test or check after changes. Root `pnpm check`, `pnpm test`, and `pnpm build` do not validate the separate `web/` app; validate each affected app with its own scripts. Do not run migration or push commands unless a schema change is required and the target environment is understood.

## Working Rules

- Keep changes focused and follow existing patterns in the owning module.
- Preserve existing authentication, CMS review/publishing, backend proxy, and deployment behavior unless the task explicitly changes it. Verify dependencies before changing production routing.
- Treat contact submissions and credentials as sensitive. Never commit secrets, database URLs, OAuth credentials, or storage keys.
- Follow the CMS workflow: Draft → Pending Review → Approved → Published. Do not bypass preview, review, or approval controls.
- Update relevant documentation when behavior, deployment, or operational procedures change.
