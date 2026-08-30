import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

function checkTag(tag) {
  return spawnSync(process.execPath, ["scripts/check-release-tag.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, GITHUB_REF_NAME: tag },
  });
}

test("accepts the exact v-prefixed package version", () => {
  const result = checkTag(`v${version}`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`v${version.replaceAll(".", "\\.")}`));
});

test("rejects a tag for a different package version", () => {
  const result = checkTag("v99.99.99");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not match package version tag/);
});

test("rejects a missing release tag", () => {
  const result = spawnSync(process.execPath, ["scripts/check-release-tag.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "GITHUB_REF_NAME")),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GITHUB_REF_NAME is required/);
});

test("release workflow validates the actual tag before packaging", () => {
  const workflow = parse(readFileSync(".github/workflows/release.yml", "utf8"));
  const steps = workflow.jobs.release.steps;
  const validationIndex = steps.findIndex((step) => step.name === "Validate release tag");
  const packIndex = steps.findIndex((step) => step.run === "npm pack");
  const releaseIndex = steps.findIndex((step) => step.run?.includes("gh release create"));

  assert.notEqual(validationIndex, -1, "release workflow must validate its tag");
  assert.ok(validationIndex < packIndex, "tag validation must run before npm pack");
  assert.ok(validationIndex < releaseIndex, "tag validation must run before GitHub release creation");

  const validationCommand = steps[validationIndex].run;
  assert.equal(validationCommand, "node scripts/check-release-tag.mjs");
  assert.doesNotMatch(validationCommand, /GITHUB_REF_NAME\s*=/);

  const matching = spawnSync(validationCommand, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, GITHUB_REF_NAME: `v${version}` },
    shell: true,
  });
  assert.equal(matching.status, 0, matching.stderr);

  const mismatching = spawnSync(validationCommand, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, GITHUB_REF_NAME: "v99.99.99" },
    shell: true,
  });
  assert.equal(mismatching.status, 1);
  assert.match(mismatching.stderr, /does not match package version tag/);
});
