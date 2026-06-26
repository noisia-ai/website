#!/usr/bin/env node
/**
 * build-pdf.mjs — render an assembled Noisia deck (index.html) to a 16:9 PDF.
 *
 * Usage:  node build-pdf.mjs <path/to/index.html> [out.pdf]
 *
 * No npm dependency: it drives a locally installed headless Chrome/Chromium via
 * --print-to-pdf. The deck engine (deck-stage.js) already ships an @media print
 * block that lays out one 1920x1080 slide per page, so the output is a clean deck.
 *
 * If you prefer the in-browser path, just open index.html and use Chrome →
 * Print → Save as PDF (same result).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const input = process.argv[2];
if (!input || !existsSync(input)) {
  console.error("Usage: node build-pdf.mjs <index.html> [out.pdf]");
  process.exit(1);
}
const htmlPath = resolve(input);
const outPath = resolve(process.argv[3] ?? join(dirname(htmlPath), "deck.pdf"));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("No Chrome/Chromium found. Set CHROME_PATH, or open the deck in Chrome and Print → Save as PDF.");
  process.exit(2);
}

console.log(`Rendering ${htmlPath}\n  with ${chrome}\n  → ${outPath}`);
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${outPath}`,
  pathToFileURL(htmlPath).href,
], { stdio: "inherit" });
console.log("Done.");
