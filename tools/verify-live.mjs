// Read-only check of the live site after an upload (brief R6 §2.9):
//
//   npm run verify:live                       # https://timurmanjosov.com
//   npm run verify:live -- --base <url>       # another origin (tests: localhost)
//   npm run verify:live -- --today 2026-11-20 # "today" for scheduled posts
//
// Only GET requests with Node's built-in fetch, at most four at a time, no
// dependency. What it checks:
//
// - every URL of the sitemap answers 200 with text/html, without a redirect
//   (the only redirects the site makes on purpose are the language door on
//   "/" and the table in deploy/site-config.json; both are checked
//   separately against that file);
// - on every page: the security headers of deploy/site-config.json, the CSP
//   core directives and no 'unsafe-*', HSTS (https only), canonical = URL,
//   hreflang alternates that link back, JSON-LD that parses, no noindex;
// - robots.txt, llms.txt, llms-full.txt, both feeds (well-formed XML with
//   items), security.txt (Expires in the future);
// - 404 behaviour (status 404, noindex) in both languages;
// - the Bitcoin post in both languages; no scheduled or draft post is
//   reachable or listed (dates from src/content, Berlin calendar days);
// - the Content-Type of the Markdown twins (a WARNUNG, not a FEHLER: it
//   depends on the server's MIME table, DECISIONS R6-D12).
//
// Output in German, FEHLER and WARNUNG apart. Exit code 0 only without FEHLER.
import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { isScheduled, resolveBuildDay } from "../src/lib/schedule.ts";

const SITE = "https://timurmanjosov.com";
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const base = new URL(arg("--base", SITE)).origin;
const today = resolveBuildDay(arg("--today", undefined));
const https = base.startsWith("https:");
const config = JSON.parse(readFileSync(new URL("../deploy/site-config.json", import.meta.url), "utf8"));

const errors = [];
const warnings = [];
const fehler = (where, msg) => errors.push(`${where}: ${msg}`);
const warnung = (where, msg) => warnings.push(`${where}: ${msg}`);

/** The path of a site URL or a path. */
const pathOf = (url) => new URL(url, SITE).pathname;

// ---- fetching: GET only, at most four in flight, cached --------------------
const LIMIT = 4;
let active = 0;
const queue = [];
const slot = () => {
  if (active < LIMIT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
};
const release = () => {
  const next = queue.shift();
  if (next) next();
  else active--;
};
const cache = new Map();
let requests = 0;
function get(path, headers = {}) {
  const key = `${path} ${JSON.stringify(headers)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        await slot();
        try {
          requests++;
          const res = await fetch(base + path, { redirect: "manual", headers });
          const body = await res.text();
          return { status: res.status, headers: res.headers, body };
        } catch (e) {
          return { status: 0, headers: new Headers(), body: "", error: String(e?.cause?.code ?? e) };
        } finally {
          release();
        }
      })(),
    );
  }
  return cache.get(key);
}
const all = (items, fn) => Promise.all(items.map(fn));

// ---- helpers ------------------------------------------------------------------
const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([a-z:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const linkTags = (html) => [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]));
const robotsMeta = (html) => html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";

/** Minimal well-formedness check: balanced tags outside CDATA/comments/PIs. */
function wellFormed(xml) {
  const s = xml
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "");
  const stack = [];
  for (const m of s.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (!close) stack.push(name);
    else if (stack.pop() !== name) return false;
  }
  return stack.length === 0 && !/<(?![!?/A-Za-z])/.test(s);
}

function checkHeaders(where, h) {
  for (const [name, expected] of Object.entries(config.headers)) {
    if (name === "Strict-Transport-Security" && !https) continue; // meaningless over http
    const value = h.get(name);
    if (!value) fehler(where, `Header ${name} fehlt`);
    else if (name !== "Content-Security-Policy" && value !== expected)
      warnung(where, `Header ${name} weicht ab: "${value}" (erwartet "${expected}")`);
  }
  const csp = h.get("Content-Security-Policy") ?? "";
  if (csp) {
    for (const d of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ])
      if (!csp.split(";").some((part) => part.trim() === d)) fehler(where, `CSP ohne "${d}"`);
    if (/'unsafe-(inline|eval|hashes)'/.test(csp)) fehler(where, "CSP erlaubt 'unsafe-…'");
    if (csp !== config.headers["Content-Security-Policy"])
      warnung(where, "CSP weicht im Wortlaut von deploy/site-config.json ab");
  }
  if (https) {
    const hsts = h.get("Strict-Transport-Security") ?? "";
    const age = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
    if (hsts && age < 15552000) fehler(where, `HSTS max-age zu kurz (${age})`);
  }
}

// ---- local content: which posts must be public, which must not ------------------
const posts = [];
for (const lang of ["de", "en"]) {
  for (const f of readdirSync(`src/content/blog/${lang}`).filter((n) => n.endsWith(".md"))) {
    const fm = parseYaml(
      readFileSync(`src/content/blog/${lang}/${f}`, "utf8").match(/^---\n([\s\S]*?)\n---/)[1],
    );
    posts.push({
      lang,
      slug: f.slice(0, -3),
      url: `/${lang}/blog/${f.slice(0, -3)}/`,
      key: fm.translationKey,
      hidden: Boolean(fm.draft) || isScheduled(new Date(fm.date), today),
      draft: Boolean(fm.draft),
    });
  }
}

// ---- 1. sitemap and every page ----------------------------------------------------
const sitemap = await get("/sitemap.xml");
if (sitemap.status !== 200) fehler("/sitemap.xml", `Status ${sitemap.status || sitemap.error}`);
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (sitemap.status === 200 && !locs.length) fehler("/sitemap.xml", "keine URLs");
for (const loc of locs) if (!loc.startsWith(`${SITE}/`)) fehler("/sitemap.xml", `fremde URL ${loc}`);

const pages = new Map(); // path → { links, html }
await all(locs, async (loc) => {
  const path = pathOf(loc);
  const res = await get(path);
  if (res.status >= 300 && res.status < 400) {
    fehler(
      path,
      `leitet weiter (${res.status} → ${res.headers.get("location")}), Sitemap-URLs dürfen nicht weiterleiten`,
    );
    return;
  }
  if (res.status !== 200) {
    fehler(path, `Status ${res.status || res.error}`);
    return;
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("text/html")) fehler(path, `Content-Type ${type || "fehlt"} statt text/html`);
  checkHeaders(path, res.headers);
  const links = linkTags(res.body);
  pages.set(path, { links, html: res.body });
  const canonical = links.find((l) => l.rel === "canonical")?.href;
  if (canonical !== loc) fehler(path, `canonical ${canonical ?? "fehlt"} ≠ ${loc}`);
  if (/noindex/.test(robotsMeta(res.body))) fehler(path, "noindex auf einer Seite der Sitemap");
  for (const m of res.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      fehler(path, "JSON-LD nicht parsebar");
    }
  }
});

// hreflang: every alternate exists and links back.
await all([...pages.entries()], async ([path, { links }]) => {
  const self = `${SITE}${path}`;
  for (const alt of links.filter((l) => l.rel === "alternate" && l.hreflang && l.hreflang !== "x-default")) {
    if (alt.href === self) continue;
    const other = pathOf(alt.href);
    let back = pages.get(other)?.links;
    if (!back) {
      const res = await get(other);
      if (res.status !== 200) {
        fehler(path, `hreflang ${alt.hreflang} → ${other}: Status ${res.status || res.error}`);
        continue;
      }
      back = linkTags(res.body);
    }
    if (!back.some((l) => l.rel === "alternate" && l.hreflang && l.href === self))
      fehler(path, `hreflang ${alt.hreflang} → ${other} verweist nicht zurück`);
  }
});

// ---- 2. Markdown twins (Content-Type only a warning) --------------------------------
const twins = [
  ...new Set(
    [...pages.values()].flatMap(({ links }) =>
      links.filter((l) => l.rel === "alternate" && l.type === "text/markdown").map((l) => l.href),
    ),
  ),
];
const twinTypes = new Map();
await all(twins, async (href) => {
  const res = await get(pathOf(href));
  if (res.status !== 200) fehler(href, `Markdown-Zwilling: Status ${res.status || res.error}`);
  else {
    const type = (res.headers.get("content-type") ?? "fehlt").split(";")[0];
    twinTypes.set(type, (twinTypes.get(type) ?? 0) + 1);
  }
});
for (const [type, n] of twinTypes)
  if (type !== "text/markdown")
    warnung(
      "Markdown-Zwillinge",
      `${n} Datei(en) mit Content-Type ${type} statt text/markdown (Vorschlag: DECISIONS R6-D12)`,
    );

// ---- 3. robots, llms, feeds, security.txt ------------------------------------------------
const text = async (path, typePrefix) => {
  const res = await get(path);
  if (res.status !== 200) {
    fehler(path, `Status ${res.status || res.error}`);
    return "";
  }
  const type = res.headers.get("content-type") ?? "";
  if (typePrefix && !type.startsWith(typePrefix)) fehler(path, `Content-Type ${type || "fehlt"}`);
  return res.body;
};
const [robots, llms, llmsFull, security] = await Promise.all([
  text("/robots.txt", "text/plain"),
  text("/llms.txt", "text/plain"),
  text("/llms-full.txt", "text/plain"),
  get("/.well-known/security.txt"),
]);
if (robots && !robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) fehler("/robots.txt", "kein Sitemap-Verweis");
if (robots && !/^User-agent: \*$/m.test(robots))
  fehler("/robots.txt", "keine Gruppe für alle (User-agent: *)");
if (llms && !/^# \S/.test(llms)) fehler("/llms.txt", "beginnt nicht mit einer H1");
if (llms && !/^> \S/m.test(llms)) fehler("/llms.txt", "keine Kurzbeschreibung (Blockquote)");
if (llmsFull && Buffer.byteLength(llmsFull) > 1.5e6) warnung("/llms-full.txt", "größer als 1,5 MB");
const feeds = {};
for (const lang of ["de", "en"]) {
  const path = `/${lang}/feed.xml`;
  const body = await text(path, "");
  feeds[lang] = body;
  if (!body) continue;
  if (!/^<\?xml/.test(body) || !/<rss\b/.test(body) || !wellFormed(body))
    fehler(path, "kein wohlgeformtes RSS");
  if (!/<item>/.test(body)) fehler(path, "keine Einträge");
}
if (security.status === 200) {
  const expires = security.body.match(/^Expires:\s*(.+)$/m)?.[1];
  if (!expires) fehler("/.well-known/security.txt", "ohne Expires");
  else if (!(new Date(expires) > new Date()))
    fehler("/.well-known/security.txt", `abgelaufen (${expires.trim()})`);
  if (!/^Contact:\s*\S/m.test(security.body)) fehler("/.well-known/security.txt", "ohne Contact");
} else {
  warnung(
    "/.well-known/security.txt",
    `Status ${security.status || security.error} (nur vorhanden mit contact.email)`,
  );
}

// ---- 4. 404, language door, redirects ------------------------------------------------------
const marker = `verify-live-${Date.now().toString(36)}`;
for (const lang of ["de", "en"]) {
  const path = `/${lang}/${marker}/`;
  const res = await get(path);
  if (res.status !== 404) fehler(path, `Status ${res.status || res.error} statt 404`);
  else if (!/noindex/.test(robotsMeta(res.body))) fehler(path, "404-Seite ohne noindex");
}
const door = config.languageDoor;
for (const [al, want] of [
  ["de-DE,de;q=0.9", door.match],
  ["en-US,en;q=0.9", door.default],
]) {
  const res = await get(door.path, { "Accept-Language": al });
  if (res.status !== door.status || res.headers.get("location") !== want)
    fehler(
      `${door.path} (${al})`,
      `Sprachtür: ${res.status} → ${res.headers.get("location")} statt ${door.status} → ${want}`,
    );
}
await all(config.redirects, async (r) => {
  const res = await get(r.from);
  const location = res.headers.get("location") ?? "";
  if (
    res.status !== r.status ||
    (location !== r.to && location !== `${SITE}${r.to}` && location !== `${base}${r.to}`)
  )
    fehler(r.from, `Weiterleitung ${res.status} → ${location || "–"} statt ${r.status} → ${r.to}`);
});

// ---- 5. posts: the Bitcoin post exists, nothing scheduled is reachable ----------------------------
const listings = [sitemap.body, llms, llmsFull, feeds.de ?? "", feeds.en ?? ""];
for (const p of posts.filter((x) => x.key === "bitcoin-coming-decades" && !x.hidden)) {
  if (!locs.includes(`${SITE}${p.url}`)) fehler(p.url, "Bitcoin-Artikel fehlt in der Sitemap");
  if ((await get(p.url)).status !== 200) fehler(p.url, "Bitcoin-Artikel nicht erreichbar");
}
if (!posts.some((x) => x.key === "bitcoin-coming-decades" && !x.hidden && x.lang === "de"))
  warnung("Bitcoin-Artikel", `laut src/content am ${today} noch nicht öffentlich`);
await all(
  posts.filter((p) => p.hidden),
  async (p) => {
    const why = p.draft ? "Entwurf" : `geplanter Artikel (Datum nach ${today})`;
    const res = await get(p.url);
    if (res.status !== 404) fehler(p.url, `${why} erreichbar (Status ${res.status || res.error})`);
    if (listings.some((l) => l.includes(`${SITE}${p.url}`)))
      fehler(p.url, `${why} in Sitemap, llms.txt oder Feed`);
  },
);
// A due post that is not live yet: the release was built before its date.
for (const p of posts.filter((x) => !x.hidden))
  if (!locs.includes(`${SITE}${p.url}`))
    warnung(p.url, "fällig, aber nicht in der Sitemap (neuer Build nötig)");

// ---- report ------------------------------------------------------------------------------------------
const head = `verify:live gegen ${base} (Stichtag ${today}): ${pages.size} Seiten, ${twins.length} Markdown-Zwillinge, ${requests} Abrufe`;
console.log(head);
console.log(errors.length ? `\nFEHLER (${errors.length})` : "\nFEHLER: keine");
for (const e of errors) console.log(`  - ${e}`);
console.log(warnings.length ? `\nWARNUNG (${warnings.length})` : "\nWARNUNG: keine");
for (const w of warnings) console.log(`  - ${w}`);
process.exitCode = errors.length ? 1 : 0;
