import { spawnSync } from "node:child_process";

// Preview builds must never migrate the shared production database.
// Production deploys apply the existing idempotent migration script before building.
if (process.env.VERCEL_ENV !== "production" && process.env.RUN_DB_MIGRATIONS !== "1") {
  console.log("[migrate] Skipping database migrations outside production.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
