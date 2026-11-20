// Every public post shows up everywhere it should (brief R5 §2.2, quality
// pass 3), checked on the production build dist/:
//
//   node tools/check-post-surfaces.mjs
//
// For each post in src/content/blog that is neither a draft nor scheduled:
// its page with JSON-LD BlogPosting, the blog index and archive of its
// language, its category page, each of its tag pages, its language's feed,
// the sitemap, the search index and llms.txt. With at least one public post
// the "no posts yet" panel must be gone from the home pages and blog indexes.
// For posts listed in TEXT_ONLY, the metadata surfaces name the topic only.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { isScheduled, resolveBuildDay } from "../src/lib/schedule.ts";
import { reporter } from "./lib.mjs";

const r = reporter("public posts on every surface");
let checks = 0;
const expect = (cond, where, msg) => {
  checks++;
  if (!cond) r.fail(where, msg);
};
const SITE = "https://timurmanjosov.com";
const D = "dist";
const read = (p) => (existsSync(join(D, p)) ? readFileSync(join(D, p), "utf8") : "");
// Same rule as slugify() in src/i18n/utils.ts for tag URLs.
const tagSlug = (v) =>
  v
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const today = resolveBuildDay();
const posts = [];
for (const lang of ["de", "en"]) {
  for (const f of readdirSync(`src/content/blog/${lang}`).filter((n) => n.endsWith(".md"))) {
    const fm = parseYaml(
      readFileSync(`src/content/blog/${lang}/${f}`, "utf8").match(/^---\n([\s\S]*?)\n---/)[1],
    );
    if (fm.draft || isScheduled(new Date(fm.date), today)) continue;
    posts.push({ lang, slug: f.slice(0, -3), ...fm });
  }
}

const sitemap = read("sitemap.xml");
const llms = read("llms.txt");
const search = JSON.parse(read("search-index.json") || "[]");
for (const p of posts) {
  const url = `/${p.lang}/blog/${p.slug}/`;
  const where = `${p.lang}/${p.slug}`;
  const page = read(`${url}index.html`);
  expect(page.includes("<h1"), where, "post page missing");
  expect(/"@type":"BlogPosting"/.test(page), where, "no JSON-LD BlogPosting");
  for (const list of [
    `/${p.lang}/blog/`,
    `/${p.lang}/blog/archive/`,
    `/${p.lang}/blog/category/${p.category}/`,
  ])
    expect(read(`${list}index.html`).includes(`href="${url}"`), where, `not listed on ${list}`);
  for (const tag of p.tags ?? []) {
    const list = `/${p.lang}/blog/tags/${tagSlug(tag)}/`;
    expect(read(`${list}index.html`).includes(`href="${url}"`), where, `not listed on ${list}`);
  }
  expect(read(`${p.lang}/feed.xml`).includes(`${SITE}${url}`), where, "not in the feed");
  expect(sitemap.includes(`<loc>${SITE}${url}</loc>`), where, "not in the sitemap");
  expect(llms.includes(`${SITE}${url}`), where, "not in llms.txt");
  expect(
    search.some((e) => e.u === url),
    where,
    "not in the search index",
  );
}
// Text only, never metadata (brief R6 §2.6): the Bitcoin post states the
// author's own investment rules in its text. Title, description, Open Graph,
// Twitter card, JSON-LD, the feed's item head, the llms.txt entry, the
// search index's title/description and the Markdown twin's head name the
// topic only. Full-text outputs (the page body, content:encoded, the twin's
// body, llms-full.txt, the search index's text field) show the text as
// published. The words below mark the personal part; none may appear on a
// metadata surface of these posts.
const TEXT_ONLY = {
  "bitcoin-coming-decades": {
    de: [
      "Welt-ETF",
      "Sparrate",
      "Aufteilung",
      "Allokation",
      "Zielquote",
      "Rebalanc",
      "Portfolio",
      "Vermögen",
    ],
    en: ["world ETF", "savings rate", "allocation", "rebalanc", "portfolio", "wealth"],
  },
};
const metaSurfaces = (p, url) => {
  const page = read(`${url}index.html`);
  const out = [];
  out.push(page.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  for (const m of page.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g))
    if (/^(description|og:|twitter:|article:)/.test(m[1])) out.push(m[2]);
  for (const m of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) out.push(m[1]);
  const feed = read(`${p.lang}/feed.xml`);
  const item = feed.split("<item>").find((s) => s.includes(`${SITE}${url}<`)) ?? "";
  out.push(item.replace(/<content:encoded>[\s\S]*?<\/content:encoded>/, ""));
  out.push(llms.split("\n").find((l) => l.includes(`${SITE}${url})`)) ?? "");
  const entry = search.find((e) => e.u === url);
  out.push(`${entry?.t ?? ""} ${entry?.d ?? ""}`);
  out.push(read(`${url}index.md`).split(/\n# /)[0]);
  return out.join("\n");
};
for (const p of posts) {
  const words = TEXT_ONLY[p.translationKey]?.[p.lang];
  if (!words) continue;
  const url = `/${p.lang}/blog/${p.slug}/`;
  const meta = metaSurfaces(p, url).toLowerCase();
  for (const w of words)
    expect(!meta.includes(w.toLowerCase()), `${p.lang}/${p.slug}`, `metadata names "${w}" (text only)`);
  // The check must see real surfaces, not empty strings.
  expect(meta.includes(p.title.toLowerCase()), `${p.lang}/${p.slug}`, "metadata surfaces not found");
}

if (posts.length) {
  for (const p of ["/de/", "/en/", "/de/blog/", "/en/blog/"])
    expect(!read(`${p}index.html`).includes("empty-state"), p, "still shows the empty-blog panel");
}

r.done(
  `${posts.length} public post(s), ${checks} checks: page + JSON-LD, lists, category, tags, feed, sitemap, search, llms.txt; no empty state; text-only topics absent from metadata`,
);
