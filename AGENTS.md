# NEAS Repository Agent Instructions

## Project shape
This repository contains two separately built applications:
- Root: React + Vite + Express + tRPC + Drizzle/MySQL. Use the root package scripts in `package.json`.
- `web/`: Next.js + TypeScript + PostgreSQL. Use the scripts and package manager configured for that app.

Read `deployment-notes.md` before changing routing, proxy behavior, hosting, domains, or deployment configuration. Preserve the managed backend proxy and its dependencies unless a change is proven safe.

## Required behavior
- For repository-wide repair work, invoke `.github/skills/neas-multi-agent-repo-repair/SKILL.md`.
- Use specialist agents in parallel for independent reconnaissance; assign disjoint file ownership before parallel edits.
- Never claim multiple agents ran unless the runtime actually launched them.
- Never push directly to `main`, force-push, or deploy to production without explicit user approval.
- Never commit secrets, `.env` files, customer data, or production database contents.
- Do not silence errors with broad `any`, disabled checks, skipped tests, or weakened security.
- Add regression tests for repaired defects and report exact validation commands/results.
- Preserve CMS review/approval/publishing controls and existing API contracts.
- Treat production deployment as a separate step from code repair and CI success.

## Standard validation
Root app: `pnpm check`, `pnpm test`, `pnpm build`.
Next.js app: run its configured type check/build and `npm run test:clean-routes` from `web/`.
Always inspect the actual CI workflow before assuming a command, package manager, or deployment target.
