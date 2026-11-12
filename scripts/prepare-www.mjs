/**
 * Tazkeer web-asset bundler.
 *
 * The application is a static (Vanilla JS) PWA that lives in the repository
 * root so it can keep being deployed to GitHub Pages unchanged. Capacitor,
 * however, syncs a single self-contained directory into the native shells.
 *
 * This script copies only the runtime web assets into `www/` and never touches
 * the source files. Run it automatically through `npm run build`.
 */
import { cp, mkdir, rm, stat, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "www");

const FILES = [
  "index.html",
  "styles.css",
  "quran.css",
  "adhan-native.css",
  "dailyDuas.js",
  "prophets.js",
  "quran.js",
  "script.js",
  "sw.js",
  "manifest.json",
];

const DIRECTORIES = ["js", "data", "images", "css", "Download-APK"];

const clean = process.argv.includes("--clean");

async function main() {
  if (clean) {
    await rm(outDir, { recursive: true, force: true });
    console.log("[prepare-www] Removed www/");
    return;
  }

  await mkdir(outDir, { recursive: true });

  for (const file of FILES) {
    const source = path.join(root, file);
    if (!existsSync(source)) {
      console.warn(`[prepare-www] Missing file, skipped: ${file}`);
      continue;
    }
    await cp(source, path.join(outDir, file));
  }

  for (const dir of DIRECTORIES) {
    const source = path.join(root, dir);
    if (!existsSync(source)) {
      console.warn(`[prepare-www] Missing directory, skipped: ${dir}`);
      continue;
    }
    const info = await stat(source);
    if (!info.isDirectory()) continue;
    await cp(source, path.join(outDir, dir), { recursive: true });
  }

  const entries = await readdir(outDir);
  console.log(`[prepare-www] www/ ready (${entries.length} top-level entries).`);
}

main().catch((error) => {
  console.error("[prepare-www] Failed:", error);
  process.exitCode = 1;
});
