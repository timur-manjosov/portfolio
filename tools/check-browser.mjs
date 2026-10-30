// Browser checks with Playwright (Chromium) against tools/serve.mjs, which
// sends the production security headers including the strict CSP:
//
//   - axe-core WCAG 2.2 A/AA on every page, in light AND dark scheme
//     (covers colour contrast of both palettes)
//   - no horizontal overflow at 320 / 375 / 768 / 1280 px
//   - no request to another origin, no cookies, no console errors, no CSP
//     violations
//   - without JavaScript: content, navigation and language links still work
//   - theme toggle: aria-pressed in sync, choice persists, applied before paint
//   - language switcher: target exists and has the other `lang`
//   - project filter + search work with JS
//   - every feed is well-formed XML (DOMParser), redirects of old URLs
//   - language door: `/` lands on /de/ or /en/ by the browser language, both
//     through the server rule and through the static fallback script
//   - motion (revision 3): hover and focus change the computed style as
//     designed (lift ≤ 2 px buttons / ≤ 4 px cards, gradient contour, link
//     underline, nav line, focus outline); reveal-on-scroll always ends
//     visible; with prefers-reduced-motion nothing moves or is hidden and
//     transitions stay under 100 ms; without JS or without
//     IntersectionObserver nothing is hidden; no layout
//     shift (CLS 0) while loading, scrolling and hovering
//
//   node tools/check-browser.mjs [dist] [--chromium <path>]
// --chromium: use an installed Chromium (e.g. /usr/bin/chromium) instead of
// Playwright's own build (`npx playwright install chromium`, used in CI).
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { reporter } from "./lib.mjs";
import { startServer } from "./serve.mjs";

const args = process.argv.slice(2);
const chromiumAt = args.includes("--chromium") ? args[args.indexOf("--chromium") + 1] : undefined;
const dist = args[0] && !args[0].startsWith("--") ? args[0] : "dist";
const r = reporter("browser checks");
const config = JSON.parse(readFileSync(new URL("../deploy/site-config.json", import.meta.url), "utf8"));

const server = await startServer(dist, 0);
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch(chromiumAt ? { executablePath: chromiumAt } : {});
} catch (error) {
  console.error(`Cannot start Chromium (${error.message.split("\n")[0]}).`);
  console.error("Install it with: npx playwright install chromium, or pass --chromium <path>");
  server.close();
  process.exit(2);
}
console.log(`Chromium ${browser.version()}${chromiumAt ? ` (${chromiumAt})` : ""}`);

// All pages: from the sitemap plus the pages it deliberately leaves out.
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
const pages = [
  "/",
  "/404.html",
  "/de/404/",
  "/en/404/",
  ...[...sitemap.matchAll(/<loc>https:\/\/timurmanjosov\.com([^<]+)<\/loc>/g)].map((m) => m[1]),
];
const uniquePages = [...new Set(pages)];
const stats = { axe: 0, overflow: 0, noJs: 0, feeds: 0, redirects: 0, door: 0, csp: 0, motion: 0 };

/** Scroll down a viewport at a time (two frames each) and back up, then let
 * reveal transitions finish and their attributes go (src/scripts/reveal.ts,
 * DONE_AFTER = 700 ms). */
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
  await page.waitForTimeout(800);
}

// Every CSP violation becomes a console error with a fixed prefix, also the
// ones Chromium would only report to a report-uri.
const cspProbe = () => {
  document.addEventListener("securitypolicyviolation", (e) => {
    console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
  });
};

function watch(page, where, own = origin) {
  page.addInitScript(cspProbe);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== own && !["data:", "blob:"].includes(url.protocol)) {
      r.fail(where, `third-party request: ${req.url()}`);
    }
  });
  page.on("console", (msg) => {
    if (/CSP violation|Content Security Policy/.test(msg.text())) stats.csp++;
    if (msg.type() === "error" && !/404 \(Not Found\)/.test(msg.text())) {
      r.fail(where, `console error: ${msg.text().slice(0, 160)}`);
    }
  });
  page.on("pageerror", (err) => r.fail(where, `page error: ${err.message}`));
}

// 1. axe in both colour schemes + overflow at several widths + cookies.
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme });
  for (const path of uniquePages) {
    const page = await context.newPage();
    watch(page, `${path} [${scheme}]`);
    await page.goto(origin + path, { waitUntil: "load" });
    // Content below the fold fades in on scroll; axe skips invisible nodes,
    // so bring everything into its final, visible state first.
    await scrollThrough(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    stats.axe++;
    for (const v of result.violations) {
      const targets = v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(", ");
      r.fail(`${path} [${scheme}]`, `axe ${v.id} (${v.impact}): ${v.help} → ${targets}`);
    }
    if (scheme === "light") {
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        stats.overflow++;
        if (overflow > 0) r.fail(path, `horizontal overflow of ${overflow}px at ${width}px width`);
      }
    }
    await page.close();
  }
  const cookies = await context.cookies();
  if (cookies.length) r.fail(scheme, `cookies set: ${cookies.map((c) => c.name).join(", ")}`);
  await context.close();
}

// 2. Without JavaScript.
{
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
  for (const path of ["/", "/de/", "/en/", "/en/projects/", "/de/about/", "/en/search/", "/de/contact/"]) {
    const page = await context.newPage();
    watch(page, `${path} [no JS]`);
    await page.goto(origin + path);
    stats.noJs++;
    const info = await page.evaluate(() => ({
      text: document.querySelector("main")?.textContent?.trim().length ?? 0,
      navLinks: document.querySelectorAll("a[href]").length,
      bg: getComputedStyle(document.body).backgroundColor,
      hiddenToggle: document.querySelector("[data-theme-toggle]")?.hidden ?? true,
      projectItems: [...document.querySelectorAll("[data-project-list] > li")].filter((li) => !li.hidden)
        .length,
      projectTotal: document.querySelectorAll("[data-project-list] > li").length,
      searchNote: Boolean(document.querySelector("[data-search-nojs]")?.offsetParent),
      // Nothing may be faded out or shifted without JS (reveal needs JS).
      // (Heading anchors are meant to appear on hover only.)
      invisible: [...document.querySelectorAll("main *:not(.heading-anchor)")].filter((el) => {
        const s = getComputedStyle(el);
        return s.opacity !== "1" || (s.transform !== "none" && !el.matches(".visually-hidden"));
      }).length,
    }));
    if (info.invisible) r.fail(`${path} [no JS]`, `${info.invisible} element(s) faded or shifted without JS`);
    if (info.text < 40) r.fail(`${path} [no JS]`, "main content (almost) empty");
    if (info.navLinks < 5) r.fail(`${path} [no JS]`, "navigation links missing");
    if (!info.hiddenToggle) r.fail(`${path} [no JS]`, "theme toggle visible although it cannot work");
    // Dark OS setting must give a dark page without any script.
    const [rr, gg, bb] = info.bg.match(/\d+/g).map(Number);
    if (rr + gg + bb > 200) r.fail(`${path} [no JS]`, `OS dark scheme not applied (body ${info.bg})`);
    if (info.projectItems !== info.projectTotal) r.fail(`${path} [no JS]`, "projects hidden without JS");
    if (path.endsWith("/search/") && !info.searchNote)
      r.fail(`${path} [no JS]`, "no-JS search note not visible");
    await page.close();
  }
  await context.close();
}

// 3. Theme toggle.
{
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  watch(page, "theme toggle");
  await page.goto(`${origin}/en/`);
  const toggle = page.locator("[data-theme-toggle]");
  if (!(await toggle.isVisible())) r.fail("theme toggle", "not visible with JS");
  if ((await toggle.getAttribute("aria-pressed")) !== "false")
    r.fail("theme toggle", "aria-pressed not false in light");
  await toggle.click();
  // The switch may run inside a view transition (a short crossfade), whose
  // update callback is asynchronous.
  await page
    .waitForFunction(() => document.documentElement.dataset.theme === "dark", null, { timeout: 3000 })
    .catch(() => {});
  const after = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    pressed: document.querySelector("[data-theme-toggle]")?.getAttribute("aria-pressed"),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  if (after.theme !== "dark" || after.pressed !== "true")
    r.fail("theme toggle", `after click: ${JSON.stringify(after)}`);
  // Persisted and applied by the blocking /theme-init.js before first paint:
  // check the attribute at the earliest point a page script can observe.
  await page.addInitScript(() => {
    document.addEventListener("readystatechange", () => {
      if (document.readyState === "interactive") {
        window.__themeAtInteractive = document.documentElement.dataset.theme;
      }
    });
  });
  await page.goto(`${origin}/de/blog/`);
  const early = await page.evaluate(() => window.__themeAtInteractive);
  if (early !== "dark") r.fail("theme toggle", `stored theme not applied before paint (got ${early})`);
  await context.close();
}

// 4. Language switcher on every page type.
{
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of uniquePages.filter((p) => /^\/(de|en)\//.test(p))) {
    await page.goto(origin + path);
    const lang = await page.evaluate(() => document.documentElement.lang);
    const link = await page.evaluate(() => {
      const a = document.querySelector(".lang-switch a");
      return a && { href: a.getAttribute("href"), missing: a.hasAttribute("data-translation-missing") };
    });
    if (!link) {
      r.fail(path, "no language switch link");
      continue;
    }
    const res = await page.request.get(origin + link.href, { maxRedirects: 0 });
    if (res.status() !== 200) {
      r.fail(path, `language switch → ${link.href} returns ${res.status()}`);
      continue;
    }
    const otherLang = (await res.text()).match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
    if (otherLang === lang) r.fail(path, `language switch → ${link.href} has the same lang (${lang})`);
  }
  await context.close();
}

// 5. Project filter and search (with JS).
{
  const context = await browser.newContext();
  const page = await context.newPage();
  watch(page, "filter/search");
  await page.goto(`${origin}/en/projects/`);
  const total = await page.locator("[data-project-list] > li").count();
  const stages = await page
    .locator('select[name="stage"] option')
    .evaluateAll((os) => os.map((o) => o.value));
  const stage = stages.find(Boolean);
  if (stage) {
    await page.selectOption('select[name="stage"]', stage);
    const visible = await page.locator("[data-project-list] > li:not([hidden])").count();
    if (visible === 0 || visible > total)
      r.fail("project filter", `stage=${stage} shows ${visible}/${total}`);
    if (!page.url().includes(`stage=${stage}`)) r.fail("project filter", "state not mirrored in the URL");
    const status = (await page.locator("[data-filter-status]").textContent()) ?? "";
    if (!status.includes(`${visible} / ${total}`)) r.fail("project filter", `status line "${status}"`);
  } else {
    r.fail("project filter", "no stage options");
  }

  await page.goto(`${origin}/de/search/`);
  await page.fill("[data-search-input]", "Aura");
  await page
    .waitForFunction(() => document.querySelectorAll("[data-search-results] li").length > 0, null, {
      timeout: 5000,
    })
    .catch(() => r.fail("search", 'no results for "Aura"'));
  await context.close();
}

// 6. Feeds are well-formed XML (parsed by the browser's XML parser).
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/en/`);
  const feeds = [
    ...new Set(
      (await page.request.get(`${origin}/en/links/`).then((res) => res.text()))
        .match(/href="[^"]*feed\.xml"/g)
        ?.map((h) => h.slice(6, -1)) ?? [],
    ),
  ];
  for (const lang of ["de", "en"]) feeds.push(`/${lang}/feed.xml`);
  for (const feed of [...new Set(feeds)]) {
    const res = await page.request.get(origin + feed);
    const xml = await res.text();
    stats.feeds++;
    const ok = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      return !doc.querySelector("parsererror") && doc.documentElement.nodeName === "rss";
    }, xml);
    if (res.status() !== 200 || !ok) r.fail(feed, `feed not well-formed RSS (status ${res.status()})`);
  }
  await context.close();
}

// 7. Redirects of old URLs (served by tools/serve.mjs from the same table
// as the Caddy config): status, target, and the target exists.
for (const rd of config.redirects) {
  const res = await fetch(origin + rd.from, { redirect: "manual" });
  stats.redirects++;
  if (res.status !== rd.status || res.headers.get("location") !== rd.to) {
    r.fail(rd.from, `expected ${rd.status} → ${rd.to}, got ${res.status} → ${res.headers.get("location")}`);
    continue;
  }
  const target = await fetch(origin + rd.to);
  if (target.status !== 200) r.fail(rd.from, `redirect target ${rd.to} returns ${target.status}`);
}

// 8. Language door in a real browser. (a) Server rule: the request header
// decides ("-" = no header is covered by check-http, a browser always sends
// one). (b) Static fallback (server without the rule): /lang-redirect.js
// reads navigator.languages, which follows the context locale, and must
// replace the address without adding a history entry.
{
  const door = config.languageDoor;
  for (const [header, expected] of door.tests.filter(([h]) => h !== "-")) {
    const context = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": header } });
    const page = await context.newPage();
    watch(page, `door [${header}]`);
    await page.goto(`${origin}/`);
    stats.door++;
    const path = new URL(page.url()).pathname;
    if (path !== expected) r.fail(`door [${header}]`, `landed on ${path}, expected ${expected}`);
    await context.close();
  }
  const plain = await startServer(dist, 0, { languageDoor: false });
  const plainOrigin = `http://127.0.0.1:${plain.address().port}`;
  for (const [locale, expected] of [
    ["de-DE", door.match],
    ["de-AT", door.match],
    ["en-US", door.default],
    ["fr-FR", door.default],
  ]) {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    watch(page, `door fallback [${locale}]`, plainOrigin);
    await page.goto(`${plainOrigin}/`);
    await page.waitForURL(`${plainOrigin}${expected}`, { timeout: 5000 }).catch(() => {});
    stats.door++;
    const path = new URL(page.url()).pathname;
    const historyLength = await page.evaluate(() => history.length);
    if (path !== expected) r.fail(`door fallback [${locale}]`, `landed on ${path}, expected ${expected}`);
    // about:blank (the new tab) + the target. A redirect that pushed instead of
    // replacing would leave 3 entries (blank, /, target).
    if (historyLength !== 2) r.fail(`door fallback [${locale}]`, `history has ${historyLength} entries`);
    await context.close();
  }
  plain.close();
  // /de/ and /en/ never redirect, whatever the browser language.
  for (const header of ["de-DE", "en-US", "fr-FR"]) {
    for (const path of ["/de/", "/en/", "/de/about/", "/en/blog/"]) {
      const res = await fetch(origin + path, { redirect: "manual", headers: { "Accept-Language": header } });
      stats.door++;
      if (res.status !== 200) r.fail(`${path} [${header}]`, `status ${res.status}, expected 200`);
    }
  }
}

// 9. Motion and interaction (revision 3 and 4, docs/DECISIONS.md R3-D5/D6, R4-D4).
{
  const matrix = (transform, i) =>
    transform === "none" ? 0 : Number(transform.match(/matrix\(([^)]+)\)/)?.[1].split(",")[i] ?? Number.NaN);
  const tx = (transform) => matrix(transform, 4);
  const ty = (transform) => matrix(transform, 5);
  const maxDuration = (value) =>
    Math.max(...value.split(",").map((v) => Number.parseFloat(v) * (v.trim().endsWith("ms") ? 0.001 : 1)));
  const styleOf = (page, selector, pseudo) =>
    page.$eval(
      selector,
      (el, p) => {
        const s = getComputedStyle(el, p ?? undefined);
        return {
          transform: s.transform,
          opacity: s.opacity,
          boxShadow: s.boxShadow,
          background: s.backgroundColor,
          borderColor: s.borderTopColor,
          decoration: s.textDecorationColor,
          color: s.color,
          outline: `${s.outlineStyle} ${s.outlineWidth}`,
          transition: s.transitionDuration,
        };
      },
      pseudo ?? null,
    );
  const expect = (where, ok, message) => {
    stats.motion++;
    if (!ok) r.fail(`motion: ${where}`, message);
  };

  // (a) Hover and focus with motion allowed.
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    watch(page, `motion [${scheme}]`);
    await page.goto(`${origin}/en/`);
    await scrollThrough(page);

    // Card hover (R4-D4): lift ≤ 6 px, elevation up, gradient contour, state
    // layer 8 %, title in the accent colour, the arrow moves 2–4 px forward.
    const card = ".bento .card:not(.card--featured):has(.card__link)";
    const before = await styleOf(page, card);
    const ringBefore = await styleOf(page, card, "::before");
    const layerBefore = await styleOf(page, `${card} .card__link`, "::after");
    const titleBefore = await styleOf(page, `${card} .card__link`);
    await page.hover(`${card} .card__link`);
    await page.waitForTimeout(450);
    const after = await styleOf(page, card);
    const ringAfter = await styleOf(page, card, "::before");
    const layerAfter = await styleOf(page, `${card} .card__link`, "::after");
    const titleAfter = await styleOf(page, `${card} .card__link`);
    const arrow = await styleOf(page, `${card} .card__action .arrow`);
    const lift = ty(after.transform);
    expect(`card hover [${scheme}]`, lift < -0.5 && lift >= -6, `card lift ${lift}px (expected 0.5–6 px up)`);
    expect(`card hover [${scheme}]`, after.boxShadow !== before.boxShadow, "card shadow did not change");
    expect(
      `card hover [${scheme}]`,
      ringBefore.opacity === "0" && ringAfter.opacity === "1",
      `gradient contour opacity ${ringBefore.opacity} → ${ringAfter.opacity}`,
    );
    expect(
      `card state layer [${scheme}]`,
      layerBefore.opacity === "0" && layerAfter.opacity === "0.08",
      `state layer opacity ${layerBefore.opacity} → ${layerAfter.opacity} (expected 0 → 0.08)`,
    );
    expect(
      `card title [${scheme}]`,
      titleBefore.color !== titleAfter.color,
      `title colour stayed ${titleAfter.color}`,
    );
    const nudge = tx(arrow.transform);
    expect(`card arrow [${scheme}]`, nudge >= 2 && nudge <= 4, `arrow moved ${nudge}px (expected 2–4 px)`);

    const btn = ".hero .btn--primary";
    const btnBefore = await styleOf(page, btn);
    await page.hover(btn);
    await page.waitForTimeout(400);
    const btnAfter = await styleOf(page, btn);
    const btnLift = ty(btnAfter.transform);
    expect(
      `button hover [${scheme}]`,
      btnLift < -0.5 && btnLift >= -2,
      `button lift ${btnLift}px (expected ≤ 2 px)`,
    );
    expect(
      `button hover [${scheme}]`,
      btnAfter.background !== btnBefore.background,
      "button colour did not change",
    );

    // A text link: its underline takes the full colour on hover.
    const link = ".site-footer a";
    const linkBefore = await styleOf(page, link);
    await page.hover(link);
    await page.waitForTimeout(300);
    const linkAfter = await styleOf(page, link);
    expect(
      `link hover [${scheme}]`,
      linkBefore.decoration !== linkAfter.decoration && linkAfter.decoration === linkAfter.color,
      `underline ${linkBefore.decoration} → ${linkAfter.decoration} (text ${linkAfter.color})`,
    );

    const nav = ".site-nav a:not([aria-current])";
    const navBefore = await styleOf(page, nav, "::after");
    await page.hover(nav);
    await page.waitForTimeout(300);
    const navAfter = await styleOf(page, nav, "::after");
    expect(
      `nav hover [${scheme}]`,
      navBefore.opacity === "0" && Number(navAfter.opacity) > 0,
      `nav line opacity ${navBefore.opacity} → ${navAfter.opacity}`,
    );

    // Keyboard focus: a visible outline on a link, the contour on a card.
    await page.mouse.move(0, 0);
    await page.goto(`${origin}/en/projects/`);
    // First Tab stop: the skip link; then the brand link; then on to a card.
    let focused = "";
    for (let i = 0; i < 40 && !focused.includes("card__link"); i++) {
      await page.keyboard.press("Tab");
      focused = await page.evaluate(() => document.activeElement?.className ?? "");
      if (i === 1) {
        const outline = await page.evaluate(() => {
          const s = getComputedStyle(document.activeElement);
          return `${s.outlineStyle} ${s.outlineWidth}`;
        });
        expect(`focus [${scheme}]`, outline === "solid 2px", `brand link focus outline: ${outline}`);
      }
    }
    expect(`focus [${scheme}]`, focused.includes("card__link"), "Tab never reached a card link");
    await page.waitForTimeout(300);
    const focusRing = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        outline: getComputedStyle(el.closest(".card")).outlineStyle,
        contour: getComputedStyle(el.closest(".card"), "::before").opacity,
        layer: getComputedStyle(el, "::after").opacity,
      };
    });
    expect(
      `card focus [${scheme}]`,
      focusRing.outline === "solid" && focusRing.contour === "1" && focusRing.layer === "0.1",
      `card link focus: outline ${focusRing.outline}, contour ${focusRing.contour}, state layer ${focusRing.layer}`,
    );
    await context.close();
  }

  // (b) Reveal on scroll: below the fold hidden first, always visible after.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await context.newPage();
    watch(page, "reveal");
    for (const path of ["/de/", "/en/projects/", "/de/blog/"]) {
      await page.goto(origin + path);
      await page.waitForLoadState("load");
      const pending = await page.locator('[data-reveal="hidden"]').count();
      const inView = await page.evaluate(
        () =>
          [...document.querySelectorAll("[data-reveal]")].filter(
            (el) => el.getBoundingClientRect().top < innerHeight,
          ).length,
      );
      expect(`reveal ${path}`, inView === 0, `${inView} element(s) in the first viewport were hidden`);
      if (path === "/de/")
        expect(`reveal ${path}`, pending > 0, "nothing below the fold is revealed on scroll");
      await scrollThrough(page);
      const left = await page.evaluate(() => ({
        marked: document.querySelectorAll("[data-reveal]").length,
        faded: [...document.querySelectorAll("main .card, main .section-head")].filter(
          (el) => getComputedStyle(el).opacity !== "1",
        ).length,
      }));
      expect(
        `reveal ${path}`,
        left.marked === 0 && left.faded === 0,
        `after scrolling: ${JSON.stringify(left)}`,
      );
    }
    await context.close();
  }

  // (b2) A browser without IntersectionObserver: reveal.ts must mark
  // nothing, so everything is visible without scrolling.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    watch(page, "reveal without IntersectionObserver");
    for (const path of ["/de/", "/en/projects/"]) {
      await page.goto(origin + path);
      await page.waitForLoadState("load");
      const state = await page.evaluate(() => ({
        io: "IntersectionObserver" in window,
        marked: document.querySelectorAll("[data-reveal]").length,
        faded: [...document.querySelectorAll("main *:not(.heading-anchor)")].filter(
          (el) => getComputedStyle(el).opacity !== "1",
        ).length,
      }));
      expect(
        `reveal without IntersectionObserver ${path}`,
        !state.io && state.marked === 0 && state.faded === 0,
        `hidden content: ${JSON.stringify(state)}`,
      );
    }
    await context.close();
  }

  // (c) prefers-reduced-motion: nothing hidden, nothing moves, colour
  // transitions only and under 100 ms.
  {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    watch(page, "reduced motion");
    await page.goto(`${origin}/en/`);
    await page.waitForLoadState("load");
    const state = await page.evaluate(() => ({
      marked: document.querySelectorAll("[data-reveal]").length,
      faded: [...document.querySelectorAll("main *:not(.heading-anchor)")].filter(
        (el) => getComputedStyle(el).opacity !== "1",
      ).length,
    }));
    expect(
      "reduced motion",
      state.marked === 0 && state.faded === 0,
      `hidden content: ${JSON.stringify(state)}`,
    );
    const card = ".bento .card:has(.card__link)";
    await page.hover(`${card} .card__link`);
    await page.hover(".hero .btn--primary");
    await page.waitForTimeout(300);
    const moved = await page.evaluate(
      () =>
        [...document.querySelectorAll("main *, header *")].filter(
          (el) => getComputedStyle(el).transform !== "none",
        ).length,
    );
    expect("reduced motion", moved === 0, `${moved} element(s) transformed on hover`);
    for (const selector of [card, ".hero .btn--primary", ".site-nav a", ".site-footer a", `${card} .arrow`]) {
      const { transition } = await styleOf(page, selector);
      expect(
        `reduced motion ${selector}`,
        maxDuration(transition) < 0.1,
        `transition-duration ${transition} (expected < 100 ms)`,
      );
    }
    await context.close();
  }

  // (c2) Touch screens (hover: none): a tap must not leave a card lifted or
  // tinted (sticky hover); the hover rules live in @media (hover: hover).
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    watch(page, "touch");
    await page.goto(`${origin}/en/projects/`);
    await page.waitForLoadState("load");
    const media = await page.evaluate(() => matchMedia("(hover: hover)").matches);
    expect("touch", media === false, "the touch context still reports (hover: hover)");
    const card = ".card:has(.card__link)";
    await page.hover(`${card} .card__link`);
    await page.waitForTimeout(400);
    const after = await styleOf(page, card);
    const layer = await styleOf(page, `${card} .card__link`, "::after");
    expect(
      "touch",
      after.transform === "none" && layer.opacity === "0",
      `hover on a touch screen: transform ${after.transform}, state layer ${layer.opacity}`,
    );
    await context.close();
  }

  // (d) No layout shift while loading, scrolling and hovering (CLS 0).
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
    for (const path of ["/de/", "/en/", "/en/projects/", "/de/about/", "/en/blog/"]) {
      const page = await context.newPage();
      watch(page, `CLS ${path}`);
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(origin + path);
      await page.waitForLoadState("load");
      await scrollThrough(page);
      const hoverable = page.locator(".card__link, .btn").first();
      if (await hoverable.count()) await hoverable.hover();
      await page.waitForTimeout(300);
      const cls = await page.evaluate(() => window.__cls);
      expect(`CLS ${path}`, cls === 0, `cumulative layout shift ${cls}`);
      await page.close();
    }
    await context.close();
  }
}

if (stats.csp) r.fail("CSP", `${stats.csp} violation(s), see the console errors above`);

await browser.close();
server.close();
r.done(
  `${uniquePages.length} pages; axe ${stats.axe} runs (light+dark), overflow ${stats.overflow} checks, ` +
    `${stats.noJs} no-JS pages, ${stats.feeds} feeds, ${stats.redirects} redirects, ` +
    `${stats.door} language-door checks, ${stats.motion} motion checks, ${stats.csp} CSP violations, ` +
    "no third-party requests or cookies",
);
