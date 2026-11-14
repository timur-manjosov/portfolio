#!/usr/bin/env node
/**
 * Compares two build outputs file by file (HTML, XML, TXT, JSON) and prints
 * which files differ and where, after masking the content hashes in asset
 * names (/_astro/name.HASH.css), so only real changes remain. Used to check
 * that a dependency update does not change the rendered pages (R6 §2.8 b).
 *
 * Usage: node tools/compare-dist.mjs <before-dir> <after-dir> [--context 120]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error("usage: compare-dist.mjs <before-dir> <after-dir>");
  process.exit(2);
}
const ctxIdx = process.argv.indexOf("--context");
const ctx = ctxIdx > 0 ? Number(process.argv[ctxIdx + 1]) : 120;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(html|xml|txt|json)$/.test(name)) out.push(p);
  }
  return out;
}
const mask = (s) => s.replace(/(\/_astro\/[\w-]+)\.[\w-]{8}\.(css|js|woff2)/g, "$1.HASH.$2");

const before = new Map(walk(a).map((p) => [relative(a, p), p]));
const after = new Map(walk(b).map((p) => [relative(b, p), p]));
let differing = 0;
for (const [rel, p] of before) {
  if (!after.has(rel)) {
    console.log(`only before: ${rel}`);
    differing++;
    continue;
  }
  const x = mask(readFileSync(p, "utf8"));
  const y = mask(readFileSync(after.get(rel), "utf8"));
  if (x === y) continue;
  differing++;
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  console.log(`differs: ${rel} at ${i}`);
  console.log(`  before: …${x.slice(Math.max(0, i - 40), i + ctx)}…`);
  console.log(`  after:  …${y.slice(Math.max(0, i - 40), i + ctx)}…`);
}
for (const rel of after.keys()) {
  if (!before.has(rel)) {
    console.log(`only after: ${rel}`);
    differing++;
  }
}
console.log(`${before.size} files before, ${after.size} after, ${differing} differ`);
process.exit(0);
