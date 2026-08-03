#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");

const publicationHeading = "### After npm publication";
const publicationIndex = readme.indexOf(publicationHeading);
const registryInstall = "npm install --save-dev cmdcontract";

if (!readme.includes("`cmdcontract` is not published to the npm registry yet.")) {
  throw new Error("README must state that cmdcontract is not published to npm");
}

if (!readme.includes('npm install --save-dev "../cmdcontract/$package_file"')) {
  throw new Error("README must document installation from the locally packed tarball");
}

if (publicationIndex === -1 || readme.indexOf(registryInstall) < publicationIndex) {
  throw new Error("README registry installation must be conditional on npm publication");
}

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

const [packument] = JSON.parse(output);
const packedFiles = new Set(packument.files.map((file) => file.path));
const requiredFiles = new Set([
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
]);

if (packageJson.main) {
  requiredFiles.add(packageJson.main.replace(/^\.\//, ""));
}

const binEntries =
  typeof packageJson.bin === "string"
    ? [packageJson.bin]
    : Object.values(packageJson.bin ?? {});

for (const binEntry of binEntries) {
  requiredFiles.add(binEntry.replace(/^\.\//, ""));
}

const missing = [...requiredFiles].filter((file) => !packedFiles.has(file));

if (missing.length > 0) {
  console.error(`${packageJson.name} package smoke failed; missing packed file(s):`);
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`${packageJson.name} package smoke passed with ${packument.files.length} packed file(s).`);

const tmp = await mkdtemp(join(tmpdir(), "cmdcontract-package-smoke-"));
try {
  execFileSync("npm", ["pack", "--pack-destination", tmp], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const packageTgz = join(tmp, `${packageJson.name}-${packageJson.version}.tgz`);
  execFileSync("npm", ["init", "-y"], {
    cwd: tmp,
    stdio: ["ignore", "ignore", "inherit"],
  });
  execFileSync("npm", ["install", packageTgz], {
    cwd: tmp,
    stdio: ["ignore", "ignore", "inherit"],
  });

  const bin = join(tmp, "node_modules", ".bin", "cmdcontract");
  const help = execFileSync(bin, ["--help"], { encoding: "utf8", cwd: tmp });
  if (!help.includes("cmdcontract - executable CLI contract specs")) {
    throw new Error("installed CLI --help output did not include usage");
  }

  const version = execFileSync(bin, ["--version"], { encoding: "utf8", cwd: tmp }).trim();
  if (version !== packageJson.version) {
    throw new Error(`installed CLI --version returned ${version}, expected ${packageJson.version}`);
  }

  const inspect = execFileSync(
    bin,
    ["inspect", "node_modules/cmdcontract/examples/contracts/happy.yaml"],
    { encoding: "utf8", cwd: tmp },
  );
  if (!inspect.includes("reads copied fixture")) {
    throw new Error("installed CLI inspect output did not include packaged example contract");
  }

  console.log(`${packageJson.name} installed CLI smoke passed.`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
