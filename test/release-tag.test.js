import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

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
