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
if (posts.length) {
  for (const p of ["/de/", "/en/", "/de/blog/", "/en/blog/"])
    expect(!read(`${p}index.html`).includes("empty-state"), p, "still shows the empty-blog panel");
}

r.done(
  `${posts.length} public post(s), ${checks} checks: page + JSON-LD, lists, category, tags, feed, sitemap, search, llms.txt; no empty state`,
);
