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

test("root TypeScript check uses only repository-local source paths", () => {
  const config = JSON.parse(readRootFile("tsconfig.json"));

  assert.equal(config.extends, undefined);
  assert.equal(config.compilerOptions?.noEmit, true);
  assert.ok(config.include?.includes("client/src/**/*.tsx"));
  assert.ok(config.include?.includes("server/**/*.ts"));
  assert.ok(config.include?.includes("shared/**/*.ts"));
});
