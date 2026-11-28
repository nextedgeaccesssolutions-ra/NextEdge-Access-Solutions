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

test("Dependabot keeps the approved weekly cadence, grouping and PR cap", () => {
  for (const entry of entries) {
    const label = `${entry.ecosystem} ${entry.directory}`;
    assert.match(entry.block, /^      day: "monday"$/m, `${label} must run on Monday`);
    assert.match(entry.block, /^      time: "03:00"$/m, `${label} must retain the 03:00 run time`);
    assert.ok(entry.block.includes('timezone: "Asia/Manila"'), `${label} must use Asia/Manila time`);
    assert.ok(entry.block.includes("groups:") && entry.block.includes('patterns: ["*"]'), `${label} must keep grouped dependency updates`);
    assert.match(entry.block, /^    open-pull-requests-limit: 5$/m, `${label} must retain the five-PR cap`);
    assert.ok(entry.block.includes('labels: ["dependencies", "automation"]'), `${label} must keep dependency automation labels`);
  }
});
