import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readRootFile = name => readFileSync(resolve(repositoryRoot, name), "utf8");

test("root package.json remains valid JSON without generated read annotations", () => {
  const manifest = readRootFile("package.json");

  assert.doesNotThrow(() => JSON.parse(manifest));
  assert.doesNotMatch(manifest, /^\[(?:Reading|executed on device:)/m);
});

test("root pnpm lockfile remains complete and free of generated read annotations", () => {
  const lockfile = readRootFile("pnpm-lock.yaml");

  assert.match(lockfile, /^lockfileVersion: ['"]?9\.0['"]?$/m);
  assert.match(lockfile, /^importers:/m);
  assert.match(lockfile, /^packages:/m);
  assert.match(lockfile, /^snapshots:/m);
  assert.doesNotMatch(lockfile, /^\[(?:Reading|executed on device:)/m);
});
