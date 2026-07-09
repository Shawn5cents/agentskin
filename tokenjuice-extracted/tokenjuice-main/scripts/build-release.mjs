import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const releaseRoot = join(repoRoot, "release");
const packageJsonPath = join(repoRoot, "package.json");
const distPath = join(repoRoot, "dist");

function fail(message) {
  throw new Error(message);
}

function runTar(sourceDirName, tarballPath) {
  const result = spawnSync("tar", ["-czf", tarballPath, "-C", releaseRoot, sourceDirName], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`tar failed with exit ${result.status ?? "unknown"}`);
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function main() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const version = packageJson.version;
  if (typeof version !== "string" || version.length === 0) {
    fail("package.json version is required");
  }

  const releaseDirName = `tokenjuice-v${version}`;
  const stagingDir = join(releaseRoot, releaseDirName);
  const tarballName = `${releaseDirName}.tar.gz`;
  const tarballPath = join(releaseRoot, tarballName);

  try {
    await readFile(join(distPath, "cli", "main.js"), "utf8");
  } catch {
    fail("dist/cli/main.js is missing. run `pnpm build` first.");
  }

  await rm(releaseRoot, { recursive: true, force: true });
  await mkdir(join(stagingDir, "bin"), { recursive: true });

  await cp(distPath, join(stagingDir, "dist"), { recursive: true });
  await cp(packageJsonPath, join(stagingDir, "package.json"));
  await cp(join(repoRoot, "README.md"), join(stagingDir, "README.md"));
  await cp(join(repoRoot, "LICENSE"), join(stagingDir, "LICENSE"));

  const launcher = `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="\${NODE_BIN:-node}"

exec "$NODE_BIN" "$SCRIPT_DIR/../dist/cli/main.js" "$@"
`;

  const launcherPath = join(stagingDir, "bin", "tokenjuice");
  await writeFile(launcherPath, launcher, "utf8");
  await chmod(launcherPath, 0o755);

  runTar(releaseDirName, tarballPath);

  const sha = await sha256File(tarballPath);
  await writeFile(join(releaseRoot, `${tarballName}.sha256`), `${sha}  ${tarballName}\n`, "utf8");
  await writeFile(
    join(releaseRoot, "manifest.json"),
    JSON.stringify(
      {
        version,
        tag: `v${version}`,
        tarball: tarballName,
        sha256: sha,
      },
      null,
      2,
    ),
    "utf8",
  );

  process.stdout.write(`built ${tarballPath}\n`);
}

await main();
