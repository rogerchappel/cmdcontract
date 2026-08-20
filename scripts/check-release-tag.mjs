import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.GITHUB_REF_NAME;

if (!actualTag) {
  console.error("GITHUB_REF_NAME is required to validate the release tag");
  process.exit(1);
}

if (actualTag !== expectedTag) {
  console.error(`release tag ${actualTag} does not match package version tag ${expectedTag}`);
  process.exit(1);
}

console.log(`release tag ${actualTag} matches package version ${packageJson.version}`);
