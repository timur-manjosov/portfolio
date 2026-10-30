// Design review screenshots (brief R2 §2.2, R3 §2.4): key pages at several
// widths in light and dark, against the local server with the production
// headers (so the CSP applies), using the system Chromium. Also measures
// horizontal overflow at 320 px and collects CSP violations / console errors.
//
//   node tools/screenshots.mjs [dist] [--pass <name>] [--only <substring>]
//        [--pages <name,name>] [--widths <px,px>] [--full] [--tiles]
//
// --tiles additionally cuts each full-page capture into viewport-high tiles
// (<page>-<width>-<theme>-t<n>.png), so narrow pages can be read at full size.
//
// Before each capture the page is scrolled through once, so content that
// fades in on scroll (R3, src/scripts/reveal.ts) is in its final state, the
// way a visitor sees it after scrolling.
//
// Output: .screenshots/<pass>/<page>-<width>-<theme>.png (git-ignored).
// Revision 3 sets: --pass r3/vorher|r3/nachher --widths 390,1280 --full
//   --pages home-de,projects,project,about,blog,post,404
// Revision 4: every page type, run against dist-drafts (post with code and
// maths) and against dist (the empty blog as it goes live).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const dist = args[0] && !args[0].startsWith("--") ? args[0] : "dist-drafts";
const pass = opt("--pass", "latest");
const only = opt("--only", "");
const full = args.includes("--full");
const tiles = args.includes("--tiles");
const viewportHeight = 900;
const widths = opt("--widths", "360,768,1280").split(",").map(Number);
const pick = opt("--pages", "");
const out = `.screenshots/${pass}`;
mkdirSync(out, { recursive: true });

const allPages = {
  "home-de": "/de/",
  "home-en": "/en/",
  about: "/de/about/",
  projects: "/en/projects/",
  project: "/de/projects/aura/",
  blog: "/en/blog/",
  post: "/de/blog/beispiel-rsa-mathe/",
  links: "/en/links/",
  contact: "/de/contact/",
  404: "/en/does-not-exist/",
  // Revision 4 adds the remaining page types.
  "about-en": "/en/about/",
  now: "/en/now/",
  uses: "/de/uses/",
  search: "/de/search/",
  tags: "/en/blog/tags/",
  privacy: "/de/privacy/",
  // Revision 5: the four launch posts (dist-drafts shows the scheduled ones).
  "ecc-de": "/de/blog/elliptische-kurven-gruppengesetz/",
  "ecc-en": "/en/blog/elliptic-curve-group-law/",
  "ds-de": "/de/blog/doppelausgabe-whitepaper-nachgerechnet/",
  "ds-en": "/en/blog/double-spend-race-recomputed/",
  "csp-de": "/de/blog/content-security-policy-statische-seiten/",
  "subset-de": "/de/blog/subset-sum-np-vollstaendig-und-leicht/",
  "blog-de": "/de/blog/",
};
const pages = pick ? Object.fromEntries(pick.split(",").map((name) => [name, allPages[name]])) : allPages;

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
  // reveal.ts: 300 ms transition + up to 4 × 60 ms stagger.
  await page.waitForTimeout(800);
}

const server = await startServer(dist, 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const problems = [];

for (const theme of ["light", "dark"]) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: viewportHeight }, colorScheme: theme });
    for (const [name, path] of Object.entries(pages)) {
      if (only && !name.includes(only)) continue;
      const page = await ctx.newPage();
      page.on("console", (m) => {
        // The 404 page's own document status shows up as a console error.
        if (m.type() === "error" && !(name === "404" && m.text().includes("404")))
          problems.push(`${name} ${width} ${theme}: console: ${m.text()}`);
      });
      await page.goto(origin + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await scrollThrough(page);
      await page.screenshot({
        path: `${out}/${name}-${width}-${theme}.png`,
        fullPage: full || width < 1280,
      });
      if (tiles) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0, n = 1; y < height; y += viewportHeight, n++) {
          await page.screenshot({
            path: `${out}/${name}-${width}-${theme}-t${n}.png`,
            fullPage: true,
            clip: { x: 0, y, width, height: Math.min(viewportHeight, height - y) },
          });
        }
      }
      await page.close();
    }
    await ctx.close();
  }
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
