// Design review screenshots (briefs R2 §2.2, R3 §2.4, R6 §2.4): every page
// type at several widths in light and dark, against the local server with
// the production headers (so the CSP applies), using the system Chromium.
// Also measures horizontal overflow at 320 px and collects CSP violations /
// console errors.
//
//   node tools/screenshots.mjs [dist] [--out <dir> | --pass <name>]
//        [--only <substring>] [--pages <name,name>] [--widths <px,px>]
//        [--themes light,dark] [--full] [--tiles] [--zoom] [--reduced-motion]
//        [--print <page>] [--chromium <path>]
//
// --out      output directory (default .screenshots/<pass>; R6 uses
//            .tmp/shots/<round>/, git-ignored)
// --tiles    additionally cut each capture into viewport-high tiles
//            (<page>-<width>-<theme>-t<n>.png), readable at full size
// --zoom     also capture every page at 1280 px with 200 % zoom (a 640 px
//            CSS viewport at device scale factor 2), light theme
// --reduced-motion  also capture at 390 px with prefers-reduced-motion
// --print    also save <page> as PDF (print stylesheet), A4
//
// Before each capture the page is scrolled through once, so content that
// fades in on scroll (src/scripts/reveal.ts) is in its final state, the way
// a visitor sees it after scrolling.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const dist = args[0] && !args[0].startsWith("--") ? args[0] : "dist-drafts";
const out = opt("--out", `.screenshots/${opt("--pass", "latest")}`);
const only = opt("--only", "");
const full = args.includes("--full");
const tiles = args.includes("--tiles");
const zoom = args.includes("--zoom");
const reducedMotion = args.includes("--reduced-motion");
const printPage = opt("--print", "");
const viewportHeight = 900;
const widths = opt("--widths", "360,768,1280").split(",").map(Number);
const themes = opt("--themes", "light,dark").split(",");
const pick = opt("--pages", "");
mkdirSync(out, { recursive: true });

const allPages = {
  "home-de": "/de/",
  "home-en": "/en/",
  about: "/de/about/",
  "about-en": "/en/about/",
  projects: "/en/projects/",
  "projects-de": "/de/projects/",
  project: "/de/projects/aura/",
  "project-en": "/en/projects/aura/",
  blog: "/en/blog/",
  "blog-de": "/de/blog/",
  archive: "/de/blog/archive/",
  category: "/de/blog/category/blockchain/",
  tags: "/en/blog/tags/",
  tag: "/de/blog/tags/bitcoin/",
  links: "/en/links/",
  contact: "/de/contact/",
  now: "/en/now/",
  "now-de": "/de/now/",
  uses: "/de/uses/",
  search: "/de/search/",
  privacy: "/de/privacy/",
  404: "/en/does-not-exist/",
  "404-de": "/de/gibt-es-nicht/",
  // Revision 5: the four launch posts (dist-drafts shows the scheduled ones).
  "ecc-de": "/de/blog/elliptische-kurven-gruppengesetz/",
  "ecc-en": "/en/blog/elliptic-curve-group-law/",
  "ds-de": "/de/blog/doppelausgabe-whitepaper-nachgerechnet/",
  "ds-en": "/en/blog/double-spend-race-recomputed/",
  "csp-de": "/de/blog/content-security-policy-statische-seiten/",
  "subset-de": "/de/blog/subset-sum-np-vollstaendig-und-leicht/",
  // Revision 6: the Bitcoin article (both languages).
  "btc-de": "/de/blog/bitcoin-was-entschieden-wird/",
  "btc-en": "/en/blog/bitcoin-what-gets-decided/",
  // Test fixtures (dist-drafts only): example post with maths and code.
  post: "/de/blog/beispiel-rsa-mathe/",
};
const pages = pick ? Object.fromEntries(pick.split(",").map((name) => [name, allPages[name]])) : allPages;
for (const [name, path] of Object.entries(pages)) if (!path) throw new Error(`unknown page: ${name}`);

/** Scroll down one viewport at a time (two frames each), then back to the top. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await frame();
    }
    window.scrollTo(0, 0);
    await frame();
  });
  // reveal.ts: 350 ms transition + up to 4 × 80 ms stagger.
  await page.waitForTimeout(800);
}

const server = await startServer(dist, 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: opt("--chromium", "/usr/bin/chromium") });
const problems = [];

async function capture(ctx, name, path, file, { fullPage, tileHeight }) {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    // The 404 page's own document status shows up as a console error.
    if (m.type() === "error" && !(name.startsWith("404") && m.text().includes("404")))
      problems.push(`${file}: console: ${m.text()}`);
  });
  const res = await page.goto(origin + path, { waitUntil: "networkidle" });
  if (!name.startsWith("404") && res?.status() !== 200) problems.push(`${file}: HTTP ${res?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await scrollThrough(page);
  await page.screenshot({ path: `${out}/${file}.png`, fullPage });
  if (tiles) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const width = page.viewportSize().width;
    for (let y = 0, n = 1; y < height; y += tileHeight, n++) {
      await page.screenshot({
        path: `${out}/${file}-t${n}.png`,
        fullPage: true,
        clip: { x: 0, y, width, height: Math.min(tileHeight, height - y) },
      });
    }
  }
  await page.close();
}

for (const theme of themes) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: viewportHeight }, colorScheme: theme });
    for (const [name, path] of Object.entries(pages)) {
      if (only && !name.includes(only)) continue;
      await capture(ctx, name, path, `${name}-${width}-${theme}`, {
        fullPage: full || width < 1280,
        tileHeight: viewportHeight,
      });
    }
    await ctx.close();
  }
}

if (zoom) {
  // 200 % zoom at a 1280 px window: CSS sees 640 px, every pixel drawn twice.
  const ctx = await browser.newContext({
    viewport: { width: 640, height: viewportHeight / 2 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  for (const [name, path] of Object.entries(pages)) {
    if (only && !name.includes(only)) continue;
    await capture(ctx, name, path, `${name}-1280-zoom200`, {
      fullPage: true,
      tileHeight: viewportHeight / 2,
    });
  }
  await ctx.close();
}

if (reducedMotion) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: viewportHeight },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  for (const [name, path] of Object.entries(pages)) {
    if (only && !name.includes(only)) continue;
    await capture(ctx, name, path, `${name}-390-reduced`, { fullPage: true, tileHeight: viewportHeight });
  }
  await ctx.close();
}

if (printPage) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(origin + allPages[printPage], { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: `${out}/${printPage}-print.pdf`, format: "A4", printBackground: false });
  await ctx.close();
}

// Overflow at 320 px, light theme, every page of the list.
const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } });
for (const [name, path] of Object.entries(pages)) {
  const page = await ctx.newPage();
  await page.goto(origin + path, { waitUntil: "networkidle" });
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  if (w > 320) problems.push(`${name}: horizontal overflow at 320 px (scrollWidth ${w})`);
  await page.close();
}
await ctx.close();
await browser.close();
server.close();

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
}
console.log(`screenshots in ${out}/ (${problems.length} problem(s))`);
