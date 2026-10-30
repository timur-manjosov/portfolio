// Offline internal link check: every same-origin href/src in the built HTML
// (and every <loc> in sitemap.xml) must resolve to a file in dist/, and every
// #fragment must exist as an id on the target page. External links are only
// counted here; CI checks them with lychee.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { htmlFiles, read, rel, reporter } from "./lib.mjs";

const dist = process.argv[2] ?? "dist";
const r = reporter("internal links");
const SITE = "https://timurmanjosov.com";

function resolve(pathname) {
  const clean = decodeURI(pathname.split("?")[0]);
  const direct = join(dist, clean);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const index = join(dist, clean, "index.html");
  if (existsSync(index)) return index;
  return null;
}

const idCache = new Map();
function ids(file) {
  if (!idCache.has(file)) {
    idCache.set(file, new Set([...read(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

let checked = 0;
const external = new Set();
const files = htmlFiles(dist);

for (const file of files) {
  const html = read(file);
  const where = rel(dist, file);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let url = m[1].replace(/&amp;/g, "&");
    if (/^(mailto:|tel:|data:)/.test(url) || url.startsWith("&#")) continue;
    if (url.startsWith(SITE)) url = url.slice(SITE.length) || "/";
    if (/^(https?:)?\/\//.test(url)) {
      external.add(url);
      continue;
    }
    checked++;
    const [path, fragment] = url.split("#");
    const target = path === "" ? file : resolve(path.startsWith("/") ? path : join(where, "..", path));
    if (!target) {
      r.fail(where, `broken link ${url}`);
      continue;
    }
    if (fragment && target.endsWith(".html") && !ids(target).has(decodeURIComponent(fragment))) {
      r.fail(where, `missing anchor ${url}`);
    }
  }
}

const sitemap = join(dist, "sitemap.xml");
if (existsSync(sitemap)) {
  for (const m of read(sitemap).matchAll(/(?:<loc>|href=")(https:\/\/timurmanjosov\.com[^<"]*)/g)) {
    checked++;
    if (!resolve(m[1].slice(SITE.length))) r.fail("/sitemap.xml", `URL without page: ${m[1]}`);
  }
} else {
  r.fail("/sitemap.xml", "missing");
}

r.done(`${checked} internal links/URLs resolve (${external.size} distinct external links, checked in CI)`);
