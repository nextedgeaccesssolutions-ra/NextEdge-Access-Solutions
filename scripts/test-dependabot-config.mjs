import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
const blocks = config.split(/(?=^  - package-ecosystem:)/m).filter((block) => block.startsWith("  - package-ecosystem:"));
const entries = blocks.map((block) => {
  const ecosystem = block.match(/^  - package-ecosystem: "([^"]+)"/m)?.[1];
  const directory = block.match(/^    directory: "([^"]+)"/m)?.[1];
  return { ecosystem, directory, block };
});

test("Dependabot monitors root npm, web npm and GitHub Actions weekly", () => {
  const keys = entries.map(({ ecosystem, directory }) => `${ecosystem}:${directory}`);
  assert.deepEqual([...keys].sort(), ["github-actions:/", "npm:/", "npm:/web"]);
  assert.equal(new Set(keys).size, keys.length, "each package ecosystem/directory pair must be unique");
  for (const entry of entries) {
    assert.match(entry.block, /^    schedule:\n      interval: "weekly"$/m, `${entry.ecosystem} ${entry.directory} must be checked weekly`);
  }
});
