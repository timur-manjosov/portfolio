// Transfer size by resource type and layout shift, measured in a real
// browser (brief R6 §2.1): every request the page makes while loading and
// while being scrolled through once, against the local server with the
// production headers, using the system Chromium. Text resources are counted
// gzip-compressed (Caddy compresses them in production), fonts and images as
// they are (already compressed formats).
//
//   node tools/measure.mjs [dist] [--chromium <path>] [--pages name=/path/,…]
//        [--json <file>]
//
// Output: a Markdown table (requests, HTML, CSS, JS, fonts, images, total,
// CLS). CLS is the sum of layout-shift entries without recent input, the way
// the Layout Instability API reports them, over load + one scroll-through.
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { pagesFromArg } from "./measure-pages.mjs";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const dist = args[0] && !args[0].startsWith("--") ? args[0] : "dist";
const executablePath = opt("--chromium", "/usr/bin/chromium");
const jsonOut = opt("--json", "");

const pages = pagesFromArg(opt("--pages", ""));

const TEXT = /^(text\/|application\/(json|xml|javascript|ld\+json|rss\+xml)|image\/svg)/;
const kind = (type, url) => {
  if (/\.woff2(\?|$)/.test(url) || type.startsWith("font/")) return "font";
  if (type.startsWith("text/html")) return "html";
  if (type.startsWith("text/css")) return "css";
  if (/javascript/.test(type)) return "js";
  if (type.startsWith("image/")) return "image";
  return "other";
};
const kb = (n) => (n / 1024).toFixed(1);

const server = await startServer(dist, 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath });
const rows = [];

for (const [name, path] of Object.entries(pages)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await ctx.newPage();
  const sizes = { html: 0, css: 0, js: 0, font: 0, image: 0, other: 0 };
  let requests = 0;
  const pending = [];
  page.on("response", (res) => {
    if (!res.url().startsWith(origin)) return;
    pending.push(
      res
        .body()
        .then((body) => {
          const type = res.headers()["content-type"] ?? "";
          const k = kind(type, res.url());
          requests++;
          sizes[k] += TEXT.test(type) ? gzipSync(body).length : body.length;
        })
        .catch(() => {}),
    );
  });
  await page.goto(origin + path, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await frame();
    }
  });
  await page.waitForTimeout(600);
  await Promise.all(pending);
  const cls = await page.evaluate(() => window.__cls);
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);
  rows.push({ name, path, requests, ...sizes, total, cls });
  await ctx.close();
}
await browser.close();
server.close();

console.log("| Page | Requests | HTML | CSS | JS | Fonts | Images | Total (KB, gzip) | CLS |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  console.log(
    `| ${r.name} \`${r.path}\` | ${r.requests} | ${kb(r.html)} | ${kb(r.css)} | ${kb(r.js)} | ${kb(r.font)} | ${kb(r.image)} | ${kb(r.total)} | ${r.cls.toFixed(3)} |`,
  );
}
if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(rows, null, 2)}\n`);
