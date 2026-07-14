import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

mkdirSync(dist, { recursive: true });

const staticFiles = [
  "manifest.json",
  join("src", "ui.css"),
  join("src", "print.css"),
];

for (const file of staticFiles) {
  copyFileSync(join(root, file), join(dist, file.split("/").pop()));
}

const ctx = await esbuild.context({
  entryPoints: [join(root, "src", "content.ts")],
  outfile: join(dist, "content.js"),
  bundle: true,
  format: "iife",
  target: "chrome109",
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
  console.log("Watching for changes…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("Built dist/");
}
