// Open Graph images per page (brief R6 §2.5 A, DECISIONS R6-D10), rendered
// after `astro build` by tools/build.mjs:
//
//   - Which pages: those whose <meta property="og:image"> points at /og/…
//     (src/lib/og.ts decides). Everything the image shows comes from the
//     page's own head: og:image:alt (the title), <html lang>, og:type,
//     article:section and article:published_time. So the image cannot
//     disagree with the page.
//   - How: an HTML template in the light palette of src/styles/tokens.css
//     with the self-hosted Inter, screenshotted by Chromium (Playwright, a
//     dev dependency already) at 1200×630. No network, no new dependency.
//   - Deterministic and cheap: each image is cached in .cache/og/ under the
//     SHA-256 of its full HTML (template, fonts, text). A rebuild with the
//     same content launches no browser at all.
//
//   node tools/og-images.mjs [dist]        (also exported: renderOgImages)
//
// Chromium: /usr/bin/chromium if present, else Playwright's own browser
// (CI installs it with `npx playwright install chromium`).
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://timurmanjosov.com";
const CACHE = join(root, ".cache/og");

const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
const light = tokens.match(/^:root \{([\s\S]*?)\n\}/m)[1];
const c = Object.fromEntries(
  [...light.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]),
);
const font = readFileSync(join(root, "src/assets/fonts/inter-variable-latin.woff2")).toString("base64");

const LABELS = {
  de: { lang: "Deutsch", project: "Projekt", blog: "Blog" },
  en: { lang: "English", project: "Project", blog: "Blog" },
};

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === "index.html") yield p;
  }
}

const meta = (html, prop) =>
  html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`))?.[1];

/** What one page's image shows, read from its head; null if it has no own image. */
export function cardOf(html) {
  const image = meta(html, "og:image");
  if (!image?.startsWith(`${SITE}/og/`)) return null;
  const lang = html.match(/<html\b[^>]*\slang="(de|en)"/)?.[1] ?? "en";
  const path = image.slice(SITE.length);
  const url = meta(html, "og:url") ?? "";
  const kind =
    meta(html, "og:type") === "article" ? "post" : /\/projects\/[^/]+\/$/.test(url) ? "project" : "page";
  const published = meta(html, "article:published_time");
  const home = /^https:\/\/[^/]+\/(de|en)\/$/.test(url);
  return {
    path,
    lang,
    kind,
    home,
    // The home image repeats the claim under the name, as the hero does.
    subtitle: home ? unesc(html.match(/<p class="hero__claim">([^<]*)<\/p>/)?.[1] ?? "") : "",
    title: unesc(meta(html, "og:image:alt") ?? ""),
    section: unesc(meta(html, "article:section") ?? ""),
    date: published
      ? new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Berlin",
        }).format(new Date(published))
      : "",
  };
}

// The "Knotenpunkt" of the home page in miniature: a centre and six nodes.
const network = () => {
  const nodes = [
    [60, 40],
    [240, 30],
    [300, 170],
    [230, 300],
    [70, 290],
    [20, 160],
  ];
  const [cx, cy] = [165, 165];
  const edges = nodes.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`).join("");
  const ring = nodes
    .map(([x, y], i) => {
      const [nx, ny] = nodes[(i + 1) % nodes.length];
      return `<line x1="${x}" y1="${y}" x2="${nx}" y2="${ny}" class="ring"/>`;
    })
    .join("");
  const dots = nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join("");
  return `<svg class="net" viewBox="0 0 320 330" width="320" height="330" aria-hidden="true">
    <g class="edges">${ring}${edges}</g><g class="nodes">${dots}</g><circle class="hub" cx="${cx}" cy="${cy}" r="30"/></svg>`;
};

export function template(card) {
  const L = LABELS[card.lang];
  const eyebrow =
    card.kind === "post"
      ? [L.blog, card.section].filter(Boolean).join(" · ")
      : card.kind === "project"
        ? L.project
        : card.home
          ? ""
          : "Timur Manjosov";
  const title = card.title;
  const size = title.length <= 34 ? 76 : title.length <= 60 ? 64 : title.length <= 90 ? 54 : 46;
  // The home image carries the name as its title, so its brand row names the domain.
  const brand = card.home ? "timurmanjosov.com" : "Timur Manjosov";
  const foot = [card.date, L.lang, card.home ? "" : "timurmanjosov.com"].filter(Boolean).join("  ·  ");
  return `<!doctype html><html lang="${card.lang}"><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter, sans-serif; color: ${c.text};
    font-feature-settings: "cv11", "ss01"; background: ${c.bg};
    background-image:
      radial-gradient(760px 420px at 6% -90px, ${c["glow-1"]} 0%, transparent 72%),
      radial-gradient(620px 380px at 100% 20px, ${c["glow-2"]} 0%, transparent 72%);
    padding: 72px 80px 64px; display: grid; grid-template-rows: auto 1fr auto; position: relative; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 28px; font-weight: 550; letter-spacing: -0.01em; }
  .mark { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 15px; font-size: 21px;
    font-weight: 600; color: ${c["on-accent"]}; background: linear-gradient(135deg, ${c.accent}, ${c["accent-2"]}); }
  main { align-self: center; max-width: ${card.home ? 760 : 820}px; }
  .eyebrow { display: flex; align-items: center; gap: 14px; font: 500 24px ui-monospace, monospace; color: ${c["accent-2"]}; margin-bottom: 26px; }
  .eyebrow::before { content: ""; width: 28px; height: 2px; background: currentColor; }
  h1 { font-size: ${size}px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; text-wrap: balance;
    display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; padding-bottom: 6px; }
  h1.home { font-size: 104px; letter-spacing: -0.034em; width: fit-content;
    background: linear-gradient(100deg, ${c["grad-1"]} 0%, ${c["grad-2"]} 50%, ${c["grad-3"]} 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin-top: 22px; font-size: 36px; line-height: 1.3; font-weight: 450; color: ${c.muted}; }
  footer { display: flex; gap: 18px; font-size: 24px; font-weight: 500; color: ${c.muted}; font-variant-numeric: tabular-nums; }
  .net { position: absolute; right: 70px; top: 150px; }
  .edges line { stroke: ${c.border}; stroke-width: 3; }
  .edges .ring { stroke-dasharray: 2 9; stroke-linecap: round; }
  .nodes circle { fill: ${c.bg}; stroke: ${c["border-strong"]}; stroke-width: 3; }
  .hub { fill: ${c.accent}; }
</style></head><body>
  <div class="brand"><div class="mark">TM</div>${brand}</div>
  <main>
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
    <h1${card.home ? ' class="home"' : ""}>${esc(card.home ? "Timur Manjosov" : title)}</h1>
    ${card.home ? `<p class="sub">${esc(card.subtitle)}</p>` : ""}
  </main>
  <footer>${esc(foot)}</footer>
  ${network()}
</body></html>`;
}

function chromiumPath() {
  return existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined;
}

/** Renders the image of every page in `dist` that asks for one. */
export async function renderOgImages(dist) {
  const cards = [];
  for (const file of walk(dist)) {
    const card = cardOf(readFileSync(file, "utf8"));
    if (card) cards.push(card);
  }
  mkdirSync(CACHE, { recursive: true });
  let browser = null;
  let page = null;
  let rendered = 0;
  try {
    for (const card of cards) {
      const html = template(card);
      const key = createHash("sha256").update(html).digest("hex").slice(0, 32);
      const cached = join(CACHE, `${key}.png`);
      if (!existsSync(cached)) {
        if (!browser) {
          const { chromium } = await import("playwright");
          try {
            browser = await chromium.launch({ executablePath: chromiumPath() });
          } catch (error) {
            throw new Error(
              `Open Graph images need Chromium (/usr/bin/chromium or \`npx playwright install chromium\`): ${error.message.split("\n")[0]}`,
            );
          }
          page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
        }
        await page.setContent(html);
        await page.evaluate(() => document.fonts.ready);
        writeFileSync(cached, await page.screenshot({ type: "png" }));
        rendered++;
      }
      const out = join(dist, card.path);
      mkdirSync(dirname(out), { recursive: true });
      copyFileSync(cached, out);
    }
  } finally {
    await browser?.close();
  }
  return { images: cards.length, rendered };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = resolve(process.argv[2] ?? "dist");
  const r = await renderOgImages(dist);
  console.log(`✓ Open Graph images: ${r.images} pages, ${r.rendered} newly rendered`);
}
