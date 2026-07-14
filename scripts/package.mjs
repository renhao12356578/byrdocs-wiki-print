import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const releaseDir = join(root, "release");

const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const zipName = `byrdocs-wiki-print-v${version}.zip`;
const zipPath = join(releaseDir, zipName);

mkdirSync(releaseDir, { recursive: true });

for (const file of readdirSync(releaseDir)) {
  if (file.startsWith("byrdocs-wiki-print-v") && file.endsWith(".zip")) {
    rmSync(join(releaseDir, file));
  }
}

execSync("npm run build", { cwd: root, stdio: "inherit" });
execSync(`zip -r ${JSON.stringify(zipPath)} .`, { cwd: dist, stdio: "inherit" });

const stableZipPath = join(releaseDir, "byrdocs-wiki-print.zip");
execSync(`cp ${JSON.stringify(zipPath)} ${JSON.stringify(stableZipPath)}`);

console.log(`Packaged ${zipPath}`);
console.log(`Stable download name: ${stableZipPath}`);
