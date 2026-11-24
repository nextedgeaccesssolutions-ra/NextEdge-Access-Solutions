import { existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readRootFile = name => readFileSync(resolve(repositoryRoot, name), "utf8");

test("root package.json remains valid JSON without generated read annotations", () => {
  const manifestText = readRootFile("package.json");
  const manifest = JSON.parse(manifestText);

  assert.doesNotMatch(manifestText, /^\[(?:Reading|executed on device:)/m);
  assert.ok(manifest.dependencies["@vercel/speed-insights"]);
  assert.ok(manifest.dependencies["express-rate-limit"]);
  assert.ok(manifest.dependencies["ipaddr.js"]);
});

test("root pnpm lockfile remains complete and synchronized with runtime dependencies", () => {
  const lockfile = readRootFile("pnpm-lock.yaml");

  assert.match(lockfile, /^lockfileVersion: ['"]?9\.0['"]?$/m);
  assert.match(lockfile, /^importers:/m);
  assert.match(lockfile, /^packages:/m);
  assert.match(lockfile, /^snapshots:/m);
  assert.match(lockfile, /@vercel\/speed-insights/);
  assert.match(lockfile, /express-rate-limit/);
  assert.match(lockfile, /ipaddr\.js/);
  assert.doesNotMatch(lockfile, /^\[(?:Reading|executed on device:)/m);
});

test("root TypeScript check covers the application sources and no stray upload tooling", () => {
  const config = JSON.parse(readRootFile("tsconfig.json"));

  assert.equal(config.extends, undefined);
  assert.equal(config.compilerOptions?.noEmit, true);
  for (const glob of ["client/src/**/*", "server/**/*", "shared/**/*"]) {
    assert.ok(config.include?.includes(glob), `tsconfig include is missing ${glob}`);
  }

  // These came from unrelated projects uploaded on 18 Nov 2026 and were removed;
  // they must not reappear at the repository root.
  for (const file of ["generate-registry.ts", "scan-skills.ts", "skill.ts", "utils.ts", "validate-skills.ts", "AGENT_GUIDE.md"]) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false, `${file} should not be in the repo root`);
  }
});
