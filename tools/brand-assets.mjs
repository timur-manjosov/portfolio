// Brand images (R4-D7): the Open Graph default image and the favicons,
// drawn from the light palette in src/styles/tokens.css and the interface
// strings in src/i18n/ui.ts, rendered locally by Chromium with the
// self-hosted Inter. No third party, no new dependency. Run after a palette
// or wording change and commit the results:
//
//   node tools/brand-assets.mjs [--chromium <path>]   (default /usr/bin/chromium)
//
// Writes public/images/og-default.png (1200×630), public/favicon.svg,
// public/images/favicon-16.png, favicon-32.png, public/apple-touch-icon.png.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { ui } from "../src/i18n/ui.ts";

const args = process.argv.slice(2);
const i = args.indexOf("--chromium");
const executablePath = i >= 0 ? args[i + 1] : "/usr/bin/chromium";

// Light palette: the :root block of tokens.css, colour tokens only.
const tokens = readFileSync("src/styles/tokens.css", "utf8");
const root = tokens.match(/^:root \{([\s\S]*?)\n\}/m)[1];
const c = Object.fromEntries(
  [...root.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]),
);
const t = ui.en;
const font = readFileSync("src/assets/fonts/inter-variable-latin.woff2").toString("base64");

const mark = (size, radius, fontSize) => `
  <div class="mark" style="width:${size}px;height:${size}px;border-radius:${radius}px;font-size:${fontSize}px">TM</div>`;

const css = `
  @font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: Inter, sans-serif; color: ${c.text}; font-feature-settings: "cv11", "ss01"; }
  .mark { display: grid; place-items: center; color: ${c["on-accent"]}; font-weight: 600; letter-spacing: 0.01em;
    background: linear-gradient(135deg, ${c.accent}, ${c["accent-2"]}); }
`;

const og = `<!doctype html><html><head><style>${css}
  body { width: 1200px; height: 630px; overflow: hidden; background: ${c.bg};
    background-image:
      radial-gradient(760px 420px at 6% -90px, ${c["glow-1"]} 0%, transparent 72%),
      radial-gradient(620px 380px at 100% 20px, ${c["glow-2"]} 0%, transparent 72%);
    padding: 88px 88px 72px; display: grid; grid-template-rows: 1fr auto; }
  .eyebrow { display: flex; align-items: center; gap: 14px; font: 500 22px ui-monospace, monospace; color: ${c["accent-2"]}; }
  .eyebrow::before { content: ""; width: 28px; height: 2px; background: currentColor; }
  h1 { margin-top: 26px; font-size: 112px; font-weight: 600; letter-spacing: -0.034em; line-height: 1.06;
    padding-bottom: 10px; width: fit-content;
    background: linear-gradient(100deg, ${c["grad-1"]} 0%, ${c["grad-2"]} 50%, ${c["grad-3"]} 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  p { margin-top: 22px; max-width: 900px; font-size: 38px; line-height: 1.32; font-weight: 450; letter-spacing: -0.012em; }
  footer { display: flex; align-items: center; gap: 18px; font-size: 26px; font-weight: 500; color: ${c.muted}; }
</style></head><body>
  <div>
    <div class="eyebrow">${t["hero.eyebrow"]}</div>
    <h1>Timur Manjosov</h1>
    <p>${t["site.tagline"]}</p>
  </div>
  <footer>${mark(52, 14, 19)}timurmanjosov.com</footer>
</body></html>`;

const icon = (size) => `<!doctype html><html><head><style>${css}
  body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
</style></head><body>${mark(size, Math.round(size * 0.22), Math.round(size * 0.4))}</body></html>`;

const browser = await chromium.launch({ executablePath });
async function render(html, width, height, path, transparent = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, omitBackground: transparent });
  await page.close();
  console.log(`wrote ${path}`);
}
await render(og, 1200, 630, "public/images/og-default.png");
await render(icon(16), 16, 16, "public/images/favicon-16.png", true);
await render(icon(32), 32, 32, "public/images/favicon-32.png", true);
// Apple draws its own rounded corners and needs an opaque square.
await render(
  `<!doctype html><html><head><style>${css} body{width:180px;height:180px}</style></head><body>${mark(180, 0, 70)}</body></html>`,
  180,
  180,
  "public/apple-touch-icon.png",
);
await browser.close();

// The SVG favicon: the same mark; the browser picks the font (no web font
// inside an icon), so the letters use the system sans-serif.
writeFileSync(
  "public/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.accent}" />
      <stop offset="1" stop-color="${c["accent-2"]}" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)" />
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" fill="${c["on-accent"]}"
    font-family="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="25" font-weight="600">TM</text>
</svg>
`,
);
console.log("wrote public/favicon.svg");
