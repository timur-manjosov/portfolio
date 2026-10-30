// Translation report: which blog posts, projects and pages exist in only one
// language. Missing translations are allowed (brief §3.2), so this is a
// report, not a gate. It fails only on real inconsistencies:
//   - a translationKey used twice in the same language,
//   - a built page that lacks a translation but whose language switcher does
//     not say so (data-translation-missing), or the other way round.
//
// Output: human-readable summary on stdout, full JSON in reports/i18n.json
// (reports/i18n-drafts.json with --drafts). Also lists every text whose
// editorial status is still `draft-review`.
//   node tools/i18n-report.mjs [--drafts] [--strict]   (--strict: missing = failure)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { read, reporter, walk } from "./lib.mjs";

const LANGS = ["de", "en"];
const COLLECTIONS = { blog: "blog", projects: "projects", pages: "" };
const strict = process.argv.includes("--strict");
const includeDrafts = process.argv.includes("--drafts");
const dist = includeDrafts ? "dist-drafts" : "dist";
const r = reporter("i18n report");

/** Flat `key: value` frontmatter reader; enough for the scalar fields used here. */
function frontmatter(file) {
  const m = read(file).match(/^---\n([\s\S]*?)\n---/);
  const data = {};
  for (const line of (m?.[1] ?? "").split("\n")) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return data;
}

const report = {
  generated: new Date().toISOString(),
  drafts: includeDrafts,
  collections: {},
  needsReview: [],
};
let missingTotal = 0;

for (const [collection, urlBase] of Object.entries(COLLECTIONS)) {
  const items = new Map(); // key -> { de?: {...}, en?: {...} }
  for (const lang of LANGS) {
    const dir = join("src/content", collection, lang);
    if (!existsSync(dir)) continue;
    for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
      const fm = frontmatter(file);
      if (fm.draft === "true" && !includeDrafts) continue;
      // Texts drafted by the agent and not yet approved by Timur.
      if (fm.status === "draft-review") report.needsReview.push(file);
      const slug = basename(file, ".md");
      const key = fm.translationKey || slug;
      const entry = items.get(key) ?? {};
      if (entry[lang]) r.fail(file, `translationKey "${key}" used twice in ${lang}/`);
      const prefix = urlBase ? `/${lang}/${urlBase}/` : `/${lang}/`;
      entry[lang] = { file, url: `${prefix}${slug}/`, title: fm.title };
      items.set(key, entry);
    }
  }

  const rows = [...items.entries()].map(([key, e]) => ({
    key,
    ...Object.fromEntries(LANGS.map((l) => [l, e[l]?.url ?? null])),
    missing: LANGS.filter((l) => !e[l]),
  }));
  report.collections[collection] = rows;

  for (const row of rows) {
    if (row.missing.length) missingTotal++;
    // Cross-check against the build: a page without translation must show
    // the honest "translation missing" state in its language switcher.
    for (const lang of LANGS) {
      const url = row[lang];
      if (!url) continue;
      const html = join(dist, url, "index.html");
      if (!existsSync(html)) continue; // not built (e.g. draft) → nothing to compare
      const flagged = read(html).includes("data-translation-missing");
      const missing = row.missing.length > 0;
      if (missing && !flagged) r.fail(url, "translation missing, but the switcher does not say so");
      if (!missing && flagged) r.fail(url, "translation exists, but the switcher claims it is missing");
    }
  }
}

mkdirSync("reports", { recursive: true });
const out = includeDrafts ? "reports/i18n-drafts.json" : "reports/i18n.json";
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

for (const [collection, rows] of Object.entries(report.collections)) {
  const missing = rows.filter((row) => row.missing.length);
  console.log(`${collection}: ${rows.length} item(s), ${missing.length} without full translation`);
  for (const row of missing) {
    const have = LANGS.filter((l) => row[l]).join("+");
    console.log(`  - ${row.key}: only ${have} (missing ${row.missing.join(", ")})`);
  }
}
console.log(`editorial status draft-review (awaiting Timur): ${report.needsReview.length} file(s)`);
for (const f of report.needsReview) console.log(`  - ${f}`);
if (strict && missingTotal) r.fail("content", `${missingTotal} item(s) without full translation (--strict)`);
r.done(`${missingTotal} item(s) not translated into every language; details in ${out}`);
