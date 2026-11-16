import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const workflow = name => resolve(root, ".github", "workflows", name);
const exists = path => existsSync(resolve(root, path));

const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8")
);

test("root Node workflows follow the repository's pnpm package manager", () => {
  assert.match(
    packageJson.packageManager ?? "",
    /^pnpm@/,
    "root package manager must remain explicit"
  );
  assert.ok(exists("pnpm-lock.yaml"), "root pnpm lockfile must exist");
  assert.equal(
    existsSync(workflow("node.js.yml")),
    false,
    "npm ci starter workflow is incompatible with the pnpm-managed root"
  );
  assert.equal(
    existsSync(workflow("npm-publish.yml")),
    false,
    "release workflow must not run npm ci/publish for the application root"
  );
  assert.equal(
    existsSync(workflow("npm-publish-github-packages.yml")),
    false,
    "GitHub Packages workflow must not publish the application root"
  );
});

test("platform-specific workflows are not enabled without all required project manifests", () => {
  const requirements = [
    {
      workflow: "android.yml",
      groups: [
        ["gradlew"],
        ["build.gradle", "build.gradle.kts"],
        ["settings.gradle", "settings.gradle.kts"],
      ],
    },
    { workflow: "terraform.yml", groups: [["main.tf", "terraform/main.tf"]] },
    {
      workflow: "alibabacloud.yml",
      groups: [
        ["Dockerfile"],
        ["kustomization.yaml", "kustomization.yml"],
        ["deployment.yaml", "deployment.yml"],
      ],
    },
    {
      workflow: "google.yml",
      groups: [
        ["Dockerfile"],
        ["kustomization.yaml", "kustomization.yml"],
        ["deployment.yaml", "deployment.yml"],
      ],
    },
    { workflow: "deno.yml", groups: [["deno.json", "deno.jsonc"]] },
    { workflow: "jekyll-docker.yml", groups: [["_config.yml"]] },
    {
      workflow: "webpack.yml",
      groups: [
        [
          "webpack.config.js",
          "webpack.config.cjs",
          "webpack.config.mjs",
          "src/index.js",
        ],
      ],
    },
  ];

  for (const { workflow: workflowName, groups } of requirements) {
    if (existsSync(workflow(workflowName))) {
      assert.ok(
        groups.every(group => group.some(exists)),
        `${workflowName} is enabled without all required project manifests: ${groups.map(group => group.join(" or ")).join("; ")}`
      );
    }
  }
});

test("maintained NEAS CI and CodeQL evidence remain enabled without a duplicate SARIF uploader", () => {
  assert.ok(
    existsSync(workflow("ci.yml")),
    "NEAS CI workflow must remain enabled"
  );
  assert.ok(
    existsSync(workflow("codeql-evidence.yml")),
    "NEAS CodeQL evidence workflow must remain enabled"
  );
  assert.equal(
    existsSync(workflow("codeql.yml")),
    false,
    "advanced CodeQL SARIF uploader conflicts with GitHub default CodeQL setup and must remain absent"
  );

  const evidenceWorkflow = readFileSync(workflow("codeql-evidence.yml"), "utf8");
  assert.match(
    evidenceWorkflow,
    /upload:\s*never/,
    "NEAS CodeQL evidence must not upload duplicate SARIF results"
  );
  assert.match(
    evidenceWorkflow,
    /workflow_dispatch:/,
    "NEAS CodeQL evidence must remain manually dispatchable"
  );
});
