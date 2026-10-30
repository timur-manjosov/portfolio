// HTTP-level checks against tools/serve.mjs (no browser needed):
//   - every redirect of the table: status, Location, target answers 200
//   - unknown paths: 404 with the right language page (de / en / bilingual)
//   - security headers from deploy/site-config.json on pages and 404s
//   - language switcher on every page: target answers 200 with the other lang
//   - every page, feed, sitemap, robots.txt and llms.txt answers 200
//
//   node tools/check-http.mjs [dist]
import { readFileSync } from "node:fs";
import { reporter } from "./lib.mjs";
import { startServer } from "./serve.mjs";

const dist = process.argv[2] ?? "dist";
const r = reporter("HTTP (local server)");
const config = JSON.parse(readFileSync(new URL("../deploy/site-config.json", import.meta.url), "utf8"));
const server = await startServer(dist, 0);
const origin = `http://127.0.0.1:${server.address().port}`;
const get = (path, init) => fetch(origin + path, { redirect: "manual", ...init });

let checks = 0;
const sitemap = await (await get("/sitemap.xml")).text();
const pages = [...sitemap.matchAll(/<loc>https:\/\/timurmanjosov\.com([^<]+)<\/loc>/g)].map((m) => m[1]);

for (const path of [
  ...pages,
  "/robots.txt",
  "/llms.txt",
  "/de/feed.xml",
  "/en/feed.xml",
  "/search-index.json",
]) {
  const res = await get(path);
  checks++;
  if (res.status !== 200) r.fail(path, `HTTP ${res.status}`);
  // "/" is the language door itself and has no switcher.
  if (!path.endsWith("/") || path === "/") continue;
  const html = await res.text();
  const lang = html.match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
  const nav = html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const href = nav.match(/<a href="([^"]+)"/)?.[1];
  if (!href) {
    r.fail(path, "no language switch link");
    continue;
  }
  const other = await get(href);
  checks++;
  const otherLang = (await other.text()).match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
  if (other.status !== 200 || otherLang === lang) {
    r.fail(path, `language switch → ${href}: HTTP ${other.status}, lang ${otherLang}`);
  }
}

for (const rd of config.redirects) {
  const res = await get(rd.from);
  checks++;
  if (res.status !== rd.status || res.headers.get("location") !== rd.to) {
    r.fail(rd.from, `expected ${rd.status} → ${rd.to}, got ${res.status} → ${res.headers.get("location")}`);
  } else if (
    (await get(rd.to)).status !== (rd.to === config.languageDoor.path ? config.languageDoor.status : 200)
  ) {
    r.fail(rd.from, `target ${rd.to} is not 200`);
  }
}

// Language door on "/" (brief R2 §2.1): status, Location, Vary, Cache-Control
// for every Accept-Language value of the table in deploy/site-config.json.
const door = config.languageDoor;
for (const [al, to] of door.tests) {
  const res = await get(door.path, al === "-" ? {} : { headers: { "Accept-Language": al } });
  checks++;
  const got = `${res.status} ${res.headers.get("location")} vary=${res.headers.get("vary")} cache=${res.headers.get("cache-control")}`;
  if (got !== `${door.status} ${to} vary=Accept-Language cache=no-store`) {
    r.fail(`/ [Accept-Language: ${al}]`, `got ${got}`);
  }
}
// Every page under /de/ and /en/ answers directly, whatever the language
// header says: no language redirect anywhere else.
for (const path of pages.filter((p) => /^\/(de|en)\//.test(p))) {
  for (const al of ["de-DE,de;q=0.9", "en-US,en;q=0.9", "fr"]) {
    const res = await get(path, { headers: { "Accept-Language": al } });
    checks++;
    if (res.status !== 200) r.fail(path, `HTTP ${res.status} with Accept-Language ${al}`);
  }
}

const notFound = [
  ["/de/gibt-es-nicht/", 'lang="de"', "Seite nicht gefunden"],
  ["/en/does-not-exist/", 'lang="en"', "Page not found"],
  ["/does-not-exist", "Seite nicht gefunden", "Page not found"],
];
for (const [path, ...needles] of notFound) {
  const res = await get(path);
  const body = await res.text();
  checks++;
  if (res.status !== 404) r.fail(path, `HTTP ${res.status}, expected 404`);
  for (const n of needles) if (!body.includes(n)) r.fail(path, `404 body lacks ${n}`);
}

for (const path of ["/en/", "/de/does-not-exist/"]) {
  const res = await get(path);
  for (const [name, value] of Object.entries(config.headers)) {
    if (name === "Strict-Transport-Security") continue; // https only
    checks++;
    if (res.headers.get(name) !== value) r.fail(path, `header ${name} missing or different`);
  }
}

server.close();
r.done(
  `${checks} checks: pages 200, language switch targets, language door (${door.tests.length} Accept-Language cases), /de/ + /en/ never redirect, ${config.redirects.length} redirects, 404s, headers`,
);
