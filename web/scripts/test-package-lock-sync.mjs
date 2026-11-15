import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""];
const sections = ["dependencies", "devDependencies", "optionalDependencies"];
const errors = [];

if (existsSync("pnpm-lock.yaml")) {
  errors.push(
    "pnpm-lock.yaml is obsolete in web/: this app installs with npm ci and package-lock.json; remove the nested pnpm lockfile to avoid Next.js workspace-root ambiguity"
  );
}

if (!root || !lock.packages) {
  errors.push("package-lock.json is missing its root package metadata");
} else {
  if (lock.name !== manifest.name || root.name !== manifest.name) {
    errors.push(`package name mismatch: manifest=${manifest.name}, lock=${root.name ?? lock.name ?? "missing"}`);
  }
  if (lock.version !== manifest.version || root.version !== manifest.version) {
    errors.push(`package version mismatch: manifest=${manifest.version}, lock=${root.version ?? lock.version ?? "missing"}`);
  }

  for (const section of sections) {
    const declared = manifest[section] ?? {};
    const locked = root[section] ?? {};

    for (const [name, range] of Object.entries(declared)) {
      if (locked[name] !== range) {
        errors.push(`${section}.${name}: package.json=${range}, package-lock=${locked[name] ?? "missing"}`);
      }
      if (!lock.packages[`node_modules/${name}`]) {
        errors.push(`${section}.${name}: missing node_modules lock entry`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("web dependency lockfile validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("web npm manifest and package-lock are synchronized; no competing pnpm lockfile exists.");
}
