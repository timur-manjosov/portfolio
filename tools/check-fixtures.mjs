// Test fixtures never reach a production or release build (brief R5 §2.1).
//
//   node tools/check-fixtures.mjs <build dir>… [--expect <build dir>]
//
// For every post in tests/fixtures/blog/<lang>/<slug>.md, none of the given
// build directories may contain its title, its description, its URL
// (/<lang>/blog/<slug>/) or the canary word every fixture carries
// ("Testfixture" / "test fixture"). Searched: every HTML, XML (feeds,
// sitemap), JSON (search index) and text file (llms.txt, robots.txt), with
// JSON-LD inside the HTML. Titles are matched raw, HTML-escaped and
// JSON-escaped.
//
// --expect <dir>: a test build made with --fixtures; there every fixture
// page must exist (proves the check looks for the right things).
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { read, reporter, walk } from "./lib.mjs";

const r = reporter("fixtures absent from production and release builds");
const args = process.argv.slice(2);
const expectAt = args.indexOf("--expect");
const expectDir = expectAt >= 0 ? args[expectAt + 1] : undefined;
const dirs = args.filter((_, i) => expectAt < 0 || (i !== expectAt && i !== expectAt + 1));
if (!dirs.length) {
  console.error("usage: node tools/check-fixtures.mjs <build dir>… [--expect <build dir>]");
  process.exit(2);
}

const FIXTURES = "tests/fixtures/blog";
const CANARIES = ["Testfixture", "test fixture", "Test fixture"];

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unquote = (s) => s.trim().replace(/^"(.*)"$/, "$1");

const fixtures = [];
for (const lang of ["de", "en"]) {
  const dir = join(FIXTURES, lang);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    const fm = read(file).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const field = (name) => unquote(fm.match(new RegExp(`^${name}:\\s*(.*)$`, "m"))?.[1] ?? "");
    const title = field("title");
    const description = field("description");
    const slug = basename(file, ".md");
    const needles = new Set([`/${lang}/blog/${slug}/`, ...CANARIES]);
    for (const text of [title, description]) {
      if (text.length < 8) continue;
      needles.add(text);
      needles.add(escapeHtml(text));
      needles.add(JSON.stringify(text).slice(1, -1));
    }
    fixtures.push({ file, lang, slug, needles: [...needles] });
  }
}
if (!fixtures.length) r.fail(FIXTURES, "no fixtures found (wrong working directory?)");

let scanned = 0;
for (const dir of dirs) {
  if (!existsSync(dir)) {
    r.fail(dir, "build directory missing (build it first)");
    continue;
  }
  for (const out of walk(dir).filter((f) => /\.(html|xml|json|txt)$/.test(f))) {
    const text = read(out);
    scanned++;
    for (const f of fixtures)
      for (const needle of f.needles)
        if (text.includes(needle)) r.fail(out, `contains "${needle}" from ${f.file}`);
  }
  for (const f of fixtures)
    if (existsSync(join(dir, f.lang, "blog", f.slug))) r.fail(dir, `has the fixture page of ${f.file}`);
}

if (expectDir) {
  for (const f of fixtures) {
    if (!existsSync(join(expectDir, f.lang, "blog", f.slug, "index.html")))
      r.fail(expectDir, `fixture page missing: /${f.lang}/blog/${f.slug}/ (test build without --fixtures?)`);
  }
}

r.done(
  `${fixtures.length} fixtures, ${scanned} files in ${dirs.join(", ")} without any trace` +
    (expectDir ? `; all present in ${expectDir}` : ""),
);
