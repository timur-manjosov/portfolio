// Structural SEO / machine-readability checks on the built HTML:
//   - exactly one <h1>, <html lang> matches the /de/ or /en/ URL prefix
//   - title, meta description, canonical (unless noindex) pointing at itself
//   - hreflang alternates are reciprocal and include x-default when present
//   - JSON-LD parses, carries Person + WebSite, BlogPosting on posts,
//     SoftwareSourceCode on projects; Person.sameAs == rel="me" links on /links
//   - sitemap.xml lists exactly the indexable pages; robots.txt points to it
//   - every feed linked via autodiscovery exists
import { existsSync } from "node:fs";
import { join } from "node:path";
import { htmlFiles, read, rel, reporter } from "./lib.mjs";

const dist = process.argv[2] ?? "dist";
const SITE = "https://timurmanjosov.com";
const r = reporter("SEO / structured data");

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const urlOf = (file) => rel(dist, file).replace(/index\.html$/, "");

const pages = new Map();
for (const file of htmlFiles(dist)) {
  const html = read(file);
  const url = urlOf(file);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const alternates = Object.fromEntries(
    links
      .filter((l) => attr(l, "rel") === "alternate" && attr(l, "hreflang"))
      .map((l) => [attr(l, "hreflang"), attr(l, "href")]),
  );
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
  pages.set(url, {
    html,
    lang: html.match(/<html\b[^>]*\slang="([^"]+)"/)?.[1],
    noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
    canonical: attr(links.find((l) => attr(l, "rel") === "canonical") ?? "", "href"),
    alternates,
    feeds: links.filter((l) => attr(l, "type") === "application/rss+xml").map((l) => attr(l, "href")),
    graph: ld.flatMap((d) => d["@graph"] ?? [d]),
  });
}

const types = (graph) => new Set(graph.map((n) => n["@type"]));

for (const [url, p] of pages) {
  const h1s = (p.html.match(/<h1\b/g) ?? []).length;
  if (h1s !== 1) r.fail(url, `${h1s} <h1> elements (expected 1)`);
  const prefix = url.match(/^\/(de|en)\//)?.[1];
  if (prefix && p.lang !== prefix)
    r.fail(url, `<html lang="${p.lang}"> does not match URL prefix /${prefix}/`);
  if (!/<title>[^<]+<\/title>/.test(p.html)) r.fail(url, "missing <title>");
  const desc = p.html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (desc.length < 20) r.fail(url, "meta description missing or shorter than 20 chars");
  if (!/<main\b/.test(p.html)) r.fail(url, "no <main> landmark");
  if (url === "/") {
    // Language door fallback: the redirect script must come first in <head>,
    // and without JS only the two plain links are shown (brief R2 §2.1).
    if (
      !/^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*<script src="\/lang-redirect\.js"><\/script>/i.test(p.html)
    )
      r.fail(url, "lang-redirect.js is not the first element in <head>");
    const body = p.html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? "";
    if (!/^\s*<noscript>[\s\S]*<\/noscript>\s*$/.test(body))
      r.fail(url, "body has content outside <noscript>");
  }

  if (!p.noindex) {
    if (p.canonical !== `${SITE}${url}`)
      r.fail(url, `canonical ${p.canonical} does not point at the page itself`);
  }

  const langs = Object.keys(p.alternates).filter((l) => l !== "x-default");
  if (langs.length) {
    if (!p.alternates["x-default"]) r.fail(url, "hreflang alternates without x-default");
    // The page must be in its own set: as its language, or (root door) as x-default.
    const self = `${SITE}${url}`;
    const hrefs = Object.values(p.alternates);
    if (!hrefs.includes(self)) r.fail(url, "hreflang set does not include the page itself");
    for (const l of langs) {
      if (p.alternates[l] === self) continue;
      const other = pages.get(p.alternates[l].slice(SITE.length));
      if (!other) r.fail(url, `hreflang ${l} points at a missing page: ${p.alternates[l]}`);
      else if (!Object.values(other.alternates).includes(self))
        r.fail(url, `hreflang ${l} is not reciprocal`);
      else if (JSON.stringify(other.alternates) !== JSON.stringify(p.alternates)) {
        r.fail(url, `hreflang set differs from the one on ${p.alternates[l]}`);
      }
    }
  }

  const t = types(p.graph);
  if (!t.has("Person") || !t.has("WebSite")) r.fail(url, "JSON-LD lacks Person or WebSite");
  if (
    /^\/(de|en)\/blog\/(?!archive\/|tags\/|category\/|series\/)[^/]+\/$/.test(url) &&
    !t.has("BlogPosting")
  ) {
    r.fail(url, "blog post without BlogPosting JSON-LD");
  }
  if (/^\/(de|en)\/projects\/[^/]+\/$/.test(url) && !t.has("SoftwareSourceCode") && !t.has("CreativeWork")) {
    r.fail(url, "project page without SoftwareSourceCode/CreativeWork JSON-LD");
  }

  for (const feed of p.feeds) {
    if (!existsSync(join(dist, feed))) r.fail(url, `autodiscovered feed missing: ${feed}`);
  }
}

// sameAs (JSON-LD) must equal the rel="me" links on /links (brief §3.6).
for (const lang of ["de", "en"]) {
  const links = pages.get(`/${lang}/links/`);
  if (!links) {
    r.fail(`/${lang}/links/`, "page missing");
    continue;
  }
  // A set: the same profile may be linked more than once (list + footer).
  const relMe = [
    ...new Set(
      [...links.html.matchAll(/<a\b[^>]*>/g)]
        .map((m) => m[0])
        .filter((a) => /\srel="[^"]*\bme\b/.test(a))
        .map((a) => attr(a, "href")),
    ),
  ].sort();
  const person = links.graph.find((n) => n["@type"] === "Person");
  const sameAs = [...(person?.sameAs ?? [])].sort();
  if (JSON.stringify(relMe) !== JSON.stringify(sameAs)) {
    r.fail(
      `/${lang}/links/`,
      `rel="me" ${JSON.stringify(relMe)} != JSON-LD sameAs ${JSON.stringify(sameAs)}`,
    );
  }
}

// Sitemap: exactly the indexable HTML pages (404 pages and noindex excluded).
const sitemapPath = join(dist, "sitemap.xml");
if (existsSync(sitemapPath)) {
  const locs = new Set(
    [...read(sitemapPath).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length)),
  );
  // "/" always redirects by language (server) or replaces itself (script),
  // so it is the x-default of the home pages but never a sitemap entry.
  if (locs.has("/")) r.fail("/sitemap.xml", "lists the language door /, which always redirects");
  for (const [url, p] of pages) {
    if (url.endsWith(".html") || url === "/") continue; // 404.html, language door
    if (p.noindex && locs.has(url)) r.fail("/sitemap.xml", `lists noindex page ${url}`);
    if (!p.noindex && !locs.has(url)) r.fail("/sitemap.xml", `misses indexable page ${url}`);
  }
}
const robots = existsSync(join(dist, "robots.txt")) ? read(join(dist, "robots.txt")) : "";
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) r.fail("/robots.txt", "no Sitemap line");
if (!existsSync(join(dist, "llms.txt"))) r.fail("/llms.txt", "missing");

r.done(`${pages.size} pages: one h1, lang, canonical, reciprocal hreflang, JSON-LD, sitemap coverage`);
