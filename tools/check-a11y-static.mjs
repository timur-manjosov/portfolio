// axe-core WCAG 2.2 A/AA rules on every built page, in jsdom instead of a
// real browser. Exists for environments without a Chromium download (see
// docs/BLOCKERS.md); CI runs the full browser suite (tools/check-browser.mjs)
// in addition.
//
// jsdom has no layout engine, so rules that need rendering (colour contrast,
// target size, scrollable regions) are left to tools/check-contrast.mjs and
// the browser suite. Everything structural (names, labels, landmarks,
// headings, ARIA validity, lang, list structure, link names, duplicate ids…)
// is checked here.
//
//   node tools/check-a11y-static.mjs [dist]
import { createRequire } from "node:module";
import { JSDOM, VirtualConsole } from "jsdom";
import { htmlFiles, read, rel, reporter } from "./lib.mjs";

const dist = process.argv[2] ?? "dist";
const r = reporter("axe (static, jsdom)");
const axeSource = read(createRequire(import.meta.url).resolve("axe-core/axe.min.js"));
const LAYOUT_RULES = [
  "color-contrast",
  "color-contrast-enhanced",
  "target-size",
  "scrollable-region-focusable",
];

let runs = 0;
let passes = 0;
for (const file of htmlFiles(dist)) {
  const where = rel(dist, file);
  const dom = new JSDOM(read(file), {
    url: `https://timurmanjosov.com${where.replace(/index\.html$/, "")}`,
    runScripts: "outside-only",
    virtualConsole: new VirtualConsole(),
  });
  dom.window.eval(axeSource);
  const result = await dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    },
    rules: Object.fromEntries(LAYOUT_RULES.map((id) => [id, { enabled: false }])),
  });
  runs++;
  passes += result.passes.length;
  for (const v of result.violations) {
    const targets = v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(" "))
      .join(", ");
    r.fail(where, `${v.id} (${v.impact}): ${v.help} → ${targets}`);
  }
  dom.window.close();
}

r.done(
  `${runs} pages, ${passes} passed rule checks, 0 violations (layout rules: see check-contrast/check-browser)`,
);
