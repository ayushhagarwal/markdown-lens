import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseRef = process.env.BASE_REF;

function fail(message) {
  console.error(`Release check failed: ${message}`);
  process.exitCode = 1;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readBaseFile(path) {
  try {
    return git(["show", `${baseRef}:${path}`]);
  } catch {
    return null;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!baseRef) {
  console.log("Release check skipped because BASE_REF is not set.");
  process.exit(0);
}

const branchChangedFiles = git(["diff", "--name-only", `${baseRef}...HEAD`])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);
const workingTreeChangedFiles = git(["diff", "--name-only", baseRef])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);
const untrackedFiles = git(["ls-files", "--others", "--exclude-standard"])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);
const changedFiles = [
  ...branchChangedFiles,
  ...workingTreeChangedFiles,
  ...untrackedFiles,
];
const changed = new Set(changedFiles);

const requiredFiles = ["CHANGELOG.md", "package.json", "package-lock.json"];
const missingFiles = requiredFiles.filter((file) => !changed.has(file));

if (missingFiles.length > 0) {
  fail(
    `every PR must update release notes and the release version/tag marker. Missing changed file(s): ${missingFiles.join(
      ", ",
    )}.`,
  );
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const currentVersion = packageJson.version;
const lockRootVersion = packageLock.version;
const lockPackageVersion = packageLock.packages?.[""]?.version;

const basePackageJsonText = readBaseFile("package.json");
const basePackageJson = basePackageJsonText
  ? JSON.parse(basePackageJsonText)
  : null;

if (basePackageJson?.version === currentVersion) {
  fail(
    `package.json version is still ${currentVersion}; bump the release version/tag marker for this PR.`,
  );
}

if (lockRootVersion !== currentVersion) {
  fail(
    `package-lock.json root version (${lockRootVersion}) must match package.json version (${currentVersion}).`,
  );
}

if (lockPackageVersion !== currentVersion) {
  fail(
    `package-lock.json package version (${lockPackageVersion}) must match package.json version (${currentVersion}).`,
  );
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
const releaseHeading = new RegExp(
  `^##\\s+v${escapeRegExp(currentVersion)}\\b`,
  "m",
);

if (!releaseHeading.test(changelog)) {
  fail(`CHANGELOG.md must include a release heading for v${currentVersion}.`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  `Release check passed for v${currentVersion}: CHANGELOG.md, package.json, and package-lock.json are in sync.`,
);
