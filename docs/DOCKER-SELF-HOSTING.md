# NEAS Website — Docker self-hosting (review build)

This repository contains two separate applications: the public Next.js website under `web/` and the CMS/API Express + Vite application at the repository root. The Compose stack builds each application separately.

## Services

- `website-web`: Next.js public website.
- `website-api`: Express/tRPC CMS and API, serving its Vite production assets.
- `mysql`: a new local-only MySQL 8.4 database with its own named volume.

All published ports bind to loopback by default. This stack does not connect to the production MySQL database, run schema migrations, publish CMS content, or alter the Vercel deployment.

## Prerequisites and setup

- Docker Engine and Docker Compose v2.
- Node.js 22 is used in the build images.
- Copy `.env.docker.example` to `.env` and replace every `CHANGE_ME` value with unique secrets.
- Do not reuse production database credentials, OAuth secrets, storage keys, or JWT secrets.

## Validate and build

```sh
docker compose --env-file .env.docker.example config --quiet
docker compose build
docker compose up -d
docker compose ps
```

Local URLs:
- Public website: http://localhost:3002
- CMS/API: http://localhost:3100

## Database safety

The Compose MySQL service uses a new isolated `website_mysql` volume. It does not run migrations automatically. Review the schema and apply migrations only to this disposable local database after backup. Never point this stack at the production DATABASE_URL.

## CMS integration boundary

The APEX-to-CMS signed intake endpoint remains a draft PR and must be reviewed together with the APEX sender PR. Incoming summaries must be source-verified, signed, rate-limited, deduplicated, and saved as Pending Review. No Docker service receives permission to publish public pages.

## Licensing

The NEAS Website repository declares MIT in its root package manifest. Audit all bundled dependencies and notices before distributing images. Container images are build artifacts and are not pushed by the pull-request workflow.
