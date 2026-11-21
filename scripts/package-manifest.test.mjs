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

test("root TypeScript check uses repository-local application sources and excludes unrelated skill tooling", () => {
  const config = JSON.parse(readRootFile("tsconfig.json"));

  assert.equal(config.extends, undefined);
  assert.equal(config.compilerOptions?.noEmit, true);
  assert.ok(config.include?.includes("client/src/**/*.tsx"));
  assert.ok(config.include?.includes("server/**/*.ts"));
  assert.ok(config.include?.includes("shared/**/*.ts"));

  for (const file of [
    "vitest.config.ts",
    "generate-registry.ts",
    "scan-skills.ts",
    "skill.ts",
    "utils.ts",
    "validate-skills.ts",
  ]) {
    assert.ok(config.exclude?.includes(file));
  }
});
