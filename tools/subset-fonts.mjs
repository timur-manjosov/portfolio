#!/usr/bin/env node
/**
 * Regenerates the self-hosted fonts in src/assets/fonts/ and prints the
 * vertical metrics the fallback @font-face rules in tokens.css are built
 * from (docs/DECISIONS.md R6-D3). The originals are not committed; fetch
 * them once with `npm pack` into .tmp/fonts-src (git-ignored):
 *
 *   npm pack @fontsource/stix-two-math@5.3.0 --pack-destination .tmp/fonts-src
 *   npm pack @fontsource-variable/stix-two-text@5.3.0 --pack-destination .tmp/fonts-src
 *   (then unpack each tarball, see --help)
 *
 * STIX Two Math (403 KB) is cut down to the blocks a formula can use: Latin,
 * Greek, operators, arrows, delimiters, the mathematical alphanumerics and
 * whatever the OpenType MATH table needs for them (size variants and stretchy
 * parts are kept by HarfBuzz's layout closure). STIX Two Text comes as
 * Google's Latin subset already (OFL, no reserved name of ours) and is only
 * re-checked here, not changed.
 *
 * Usage: node tools/subset-fonts.mjs [--math <stix-two-math.woff2>] [--text-dir <dir>] [--metrics-only]
 */
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import fontverter from "fontverter";
import subsetFont from "subset-font";

const OUT = "src/assets/fonts";
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
if (args.includes("--help")) {
  console.log(
    "node tools/subset-fonts.mjs [--math <file>] [--text-dir <dir>] [--metrics-only]\n" +
      "Defaults: .tmp/fonts-src/math/package/files/stix-two-math-latin-400-normal.woff2,\n" +
      "          .tmp/fonts-src/stix/package/files (stix-two-text-latin-wght-{normal,italic}.woff2)",
  );
  process.exit(0);
}
const mathSrc = opt("--math", ".tmp/fonts-src/math/package/files/stix-two-math-latin-400-normal.woff2");
const textDir = opt("--text-dir", ".tmp/fonts-src/stix/package/files");
const metricsOnly = args.includes("--metrics-only");

/** Code point ranges a formula may need (inclusive). */
const MATH_RANGES = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x131, 0x131],
  [0x237, 0x237],
  [0x2c6, 0x2dc],
  [0x300, 0x36f],
  [0x391, 0x3c9],
  [0x3d1, 0x3d6],
  [0x3f0, 0x3f5],
  [0x2000, 0x206f],
  [0x2070, 0x209f],
  [0x20d0, 0x20ff],
  [0x2100, 0x214f],
  [0x2190, 0x21ff],
  [0x2200, 0x22ff],
  // Misc technical: ceiling/floor, angle brackets, the pieces of tall
  // brackets, over/under braces.
  [0x2308, 0x230b],
  [0x2329, 0x232a],
  [0x239b, 0x23b7],
  [0x23dc, 0x23e1],
  [0x25a0, 0x25a1],
  [0x25b3, 0x25b3],
  [0x25cb, 0x25cb],
  [0x27e6, 0x27ff],
  [0x2980, 0x2983],
  [0x2a00, 0x2a1f],
  // Mathematical alphanumerics: bold, italic, script, fraktur and
  // double-struck (the styles TeX commands map to), Greek bold and
  // italic, the bold and double-struck digits.
  [0x1d400, 0x1d467],
  [0x1d49c, 0x1d4cf],
  [0x1d504, 0x1d56b],
  [0x1d6a8, 0x1d71b],
  [0x1d7ce, 0x1d7e1],
  [0xfffd, 0xfffd],
];

function rangesToText(ranges) {
  let s = "";
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
  return s;
}

/** Reads head/hhea/OS2 from an sfnt buffer (enough for the fallback overrides). */
function metrics(sfnt) {
  const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  const numTables = view.getUint16(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + 16 * i;
    const tag = String.fromCharCode(...sfnt.subarray(rec, rec + 4));
    tables[tag] = view.getUint32(rec + 8);
  }
  const head = tables.head;
  const hhea = tables.hhea;
  const os2 = tables["OS/2"];
  const unitsPerEm = view.getUint16(head + 18);
  return {
    unitsPerEm,
    hheaAscender: view.getInt16(hhea + 4),
    hheaDescender: view.getInt16(hhea + 6),
    hheaLineGap: view.getInt16(hhea + 8),
    xAvgCharWidth: view.getInt16(os2 + 2),
    typoAscender: view.getInt16(os2 + 68),
    typoDescender: view.getInt16(os2 + 70),
    typoLineGap: view.getInt16(os2 + 72),
    winAscent: view.getUint16(os2 + 74),
    winDescent: view.getUint16(os2 + 76),
    xHeight: view.getUint16(os2 + 0) >= 2 ? view.getInt16(os2 + 86) : null,
    capHeight: view.getUint16(os2 + 0) >= 2 ? view.getInt16(os2 + 88) : null,
  };
}

async function report(label, file) {
  const buf = readFileSync(file);
  const sfnt = await fontverter.convert(buf, "sfnt");
  const m = metrics(sfnt);
  const pct = (v) => `${((100 * v) / m.unitsPerEm).toFixed(2)}%`;
  console.log(
    `${label}: ${(statSync(file).size / 1024).toFixed(1)} KB; ascent ${pct(m.hheaAscender)}, descent ${pct(-m.hheaDescender)}, line gap ${pct(m.hheaLineGap)}, x-height ${m.xHeight === null ? "?" : pct(m.xHeight)}, avg width ${pct(m.xAvgCharWidth)}`,
  );
}

if (!metricsOnly) {
  if (!existsSync(mathSrc)) {
    console.error(`missing ${mathSrc} (see the header of this script)`);
    process.exit(1);
  }
  // Hinting dropped: a third of the size, and current renderers ignore or
  // barely use it at text sizes (macOS ignores it, DirectWrite and FreeType
  // light hinting use outlines).
  const subset = await subsetFont(readFileSync(mathSrc), rangesToText(MATH_RANGES), {
    targetFormat: "woff2",
    noHinting: true,
  });
  writeFileSync(join(OUT, "stix-two-math.woff2"), subset);
  for (const style of ["normal", "italic"]) {
    const src = join(textDir, `stix-two-text-latin-wght-${style}.woff2`);
    if (!existsSync(src)) {
      console.error(`missing ${src} (see the header of this script)`);
      process.exit(1);
    }
    copyFileSync(src, join(OUT, `stix-two-text-latin-${style}.woff2`));
  }
}

await report("STIX Two Math", join(OUT, "stix-two-math.woff2"));
await report("STIX Two Text", join(OUT, "stix-two-text-latin-normal.woff2"));
await report("STIX Two Text italic", join(OUT, "stix-two-text-latin-italic.woff2"));
await report("Inter", join(OUT, "inter-variable-latin.woff2"));
