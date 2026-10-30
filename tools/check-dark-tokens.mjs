// Guards the dark palette (brief R4 §2.1): Timur signed it off, so no
// revision may change how dark mode looks by accident.
//
//   node tools/check-dark-tokens.mjs            check (part of npm run check)
//   node tools/check-dark-tokens.mjs --update   rewrite the snapshot; only
//                                               after a deliberate decision
//
// The snapshot (tools/fixtures/dark-tokens.snapshot.json) holds every
// declaration of the dark block in src/styles/tokens.css: colour tokens,
// syntax colours, shadows, color-scheme. The check fails when
//   1. a snapshotted declaration is missing or has a different value, in
//      either copy of the dark palette (OS preference, [data-theme="dark"]);
//   2. a declaration added to the dark blocks later uses a colour literal
//      that is not already in the snapshot (new tokens may only reuse
//      existing dark colours, e.g. a status token aliasing the teal tonal);
//   3. a token defined only in :root (so it also applies in dark mode)
//      carries a colour literal that is not in the snapshot, i.e. a light
//      colour would leak into dark mode.
// Values are compared as written (whitespace-normalised), so even an
// equivalent spelling (#FFF vs #ffffff) needs a deliberate update.
import { readFileSync, writeFileSync } from "node:fs";
import { reporter } from "./lib.mjs";

const SNAPSHOT = "tools/fixtures/dark-tokens.snapshot.json";
const r = reporter("dark palette unchanged");
const css = readFileSync("src/styles/tokens.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function declarations(body) {
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}
function body(regex, name) {
  const m = css.match(regex);
  if (!m) throw new Error(`tokens.css: ${name} block not found`);
  return declarations(m[1]);
}

const media = body(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n {2}\}/, "prefers-color-scheme dark");
const explicit = body(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/, '[data-theme="dark"]');
const root = body(/^:root \{([\s\S]*?)\n\}/m, ":root");

if (process.argv.includes("--update")) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(explicit, null, 2)}\n`);
  console.log(`snapshot written: ${SNAPSHOT} (${Object.keys(explicit).length} declarations)`);
  process.exit(0);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
const literals = (value) => (value.match(/#[0-9a-f]{3,8}\b/gi) ?? []).map((c) => c.toLowerCase());
const allowed = new Set(Object.values(snapshot).flatMap(literals));
// Not a visible colour: an opaque layer whose alpha drives a CSS mask.
const NOT_A_COLOUR = new Set(["--mask-solid"]);

for (const [where, block] of [
  ["@media (prefers-color-scheme: dark)", media],
  ['[data-theme="dark"]', explicit],
]) {
  for (const [name, value] of Object.entries(snapshot)) {
    if (!(name in block)) r.fail(where, `${name} missing (snapshot: ${value})`);
    else if (block[name] !== value) r.fail(where, `${name} changed: ${value} → ${block[name]}`);
  }
  for (const [name, value] of Object.entries(block)) {
    if (name in snapshot) continue;
    for (const c of literals(value))
      if (!allowed.has(c)) r.fail(where, `${name} adds ${c}, a colour dark mode did not have`);
  }
}
for (const [name, value] of Object.entries(root)) {
  if (name in explicit || NOT_A_COLOUR.has(name)) continue;
  for (const c of literals(value))
    if (!allowed.has(c))
      r.fail(":root", `${name} (${c}) is not overridden in dark mode, so this light colour would show there`);
}

r.done(
  `${Object.keys(snapshot).length} dark declarations match ${SNAPSHOT} in both dark blocks; no new colour reaches dark mode`,
);
