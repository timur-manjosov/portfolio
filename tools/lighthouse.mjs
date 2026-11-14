// Lighthouse (mobile, default config) for a set of pages against the local
// server with the production headers, using the system Chromium. Lighthouse
// is run through `npx lighthouse@13`, not installed as a dependency (large,
// many transitive packages, only run by hand; DECISIONS R2-D10).
//
//   node tools/lighthouse.mjs [dist] [--chromium <path>] [--pages name=/path/,…]
//        [--out <dir>] [--min <score>]
//
// Prints a Markdown table (four category scores, FCP, LCP, TBT, CLS) and
// keeps the JSON reports in <dir> (default .tmp/lighthouse, git-ignored).
// With --min, exits 1 if any category of any page scores below it.
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { pagesFromArg } from "./measure-pages.mjs";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const dist = args[0] && !args[0].startsWith("--") ? args[0] : "dist";
const chromium = opt("--chromium", "/usr/bin/chromium");
const out = opt("--out", ".tmp/lighthouse");
const min = opt("--min", "") ? Number(opt("--min", "")) : null;
const pages = pagesFromArg(opt("--pages", ""));
mkdirSync(out, { recursive: true });

const server = await startServer(dist, 0, { compress: true });
const origin = `http://127.0.0.1:${server.address().port}`;
const rows = [];
let low = 0;
try {
  for (const [name, path] of Object.entries(pages)) {
    const file = `${out}/${name.replace(/[^\w-]+/g, "-").toLowerCase()}.json`;
    // Lighthouse refuses documents with an error status, so the not-found
    // page is audited at its own URL (/<lang>/404/, served with 200).
    const target = /does-not-exist|gibt-es-nicht/.test(path)
      ? path.replace(/^\/(de|en)\/.*$/, "/$1/404/")
      : path;
    // Asynchronous on purpose: the server runs in this process, and a
    // synchronous child would block the event loop that answers Lighthouse.
    await promisify(execFile)(
      "npx",
      [
        "--yes",
        "lighthouse@13",
        origin + target,
        `--chrome-path=${chromium}`,
        "--chrome-flags=--headless=new",
        "--output=json",
        `--output-path=${file}`,
        "--quiet",
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    const lhr = JSON.parse(readFileSync(file, "utf8"));
    const score = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);
    const audit = (id) => lhr.audits[id]?.displayValue ?? "–";
    const scores = ["performance", "accessibility", "best-practices", "seo"].map(score);
    if (min !== null && scores.some((s) => s < min)) low++;
    rows.push([
      `${name} \`${target}\``,
      ...scores,
      audit("first-contentful-paint"),
      audit("largest-contentful-paint"),
      audit("total-blocking-time"),
      audit("cumulative-layout-shift"),
    ]);
  }
} finally {
  server.close();
}
console.log("| Page | Perf. | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.join(" | ")} |`);
if (low) {
  console.error(`${low} page(s) below ${min} in at least one category`);
  process.exitCode = 1;
}
