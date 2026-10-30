// Posts in one or in both languages (brief R5 §2.7), tested in both directions
// on a production build with the fixtures at build day 2030-06-15:
//
//   pair         /de/blog/fixture-geplant/ <-> /en/blog/fixture-scheduled/
//                (shared translationKey, different slugs)
//   single (en)  /en/blog/fixture-english-only/
//   single (de)  the real German-only posts in src/content/blog, if any
//
// Pair: hreflang de + en + x-default on both pages, the language switch links
// the counterpart, sitemap alternates on both URLs, JSON-LD workTranslation,
// "translation" link in the footer. Single: no hreflang alternates, the switch
// goes to the other language's blog index and is marked as missing, no
// sitemap alternates, no workTranslation. Feeds: each language lists only its
// own posts. llms.txt and the search index list every post under its own
// language. Listings in the other language show a single-language post with
// the "only in …" badge; a pair is never listed twice.
//
//   node tools/check-blog-i18n.mjs        (builds into .cache/blog-i18n/, ~2 s)
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { read, reporter } from "./lib.mjs";

const r = reporter("blog posts in one or both languages");
const expect = (cond, where, msg) => {
  if (!cond) r.fail(where, msg);
};
const OUT = ".cache/blog-i18n";
const SITE = "https://timurmanjosov.com";
rmSync(OUT, { recursive: true, force: true });
const res = spawnSync(
  "node",
  ["tools/build.mjs", "--fixtures", "--build-date", "2030-06-15", "--out-dir", OUT],
  {
    encoding: "utf8",
  },
);
if (res.status !== 0) {
  r.fail("build", `${res.stdout}\n${res.stderr}`.slice(-800));
  r.done("");
  process.exit();
}

const file = (p) => join(OUT, p);
const text = (p) => (existsSync(file(p)) ? read(file(p)) : "");
const html = (url) => text(join(url, "index.html"));
const hreflangs = (h) =>
  Object.fromEntries(
    [...h.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]),
  );
const langSwitch = (h) => h.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/)?.[0] ?? "";
const sitemapEntry = (url) =>
  text("sitemap.xml").match(new RegExp(`<url><loc>${SITE}${url}</loc>.*?</url>`))?.[0] ?? "";
const feedHas = (lang, url) => text(`${lang}/feed.xml`).includes(`${SITE}${url}`);
const searchIndex = JSON.parse(text("search-index.json") || "[]");
const indexed = (url) => searchIndex.find((e) => e.u === url);

function checkPair(from, to) {
  const [fl, tl] = [from.split("/")[1], to.split("/")[1]];
  const where = `pair ${from}`;
  const h = html(from);
  expect(h !== "", where, "page missing");
  const alt = hreflangs(h);
  expect(alt[fl] === SITE + from, where, `hreflang ${fl} is ${alt[fl]}`);
  expect(alt[tl] === SITE + to, where, `hreflang ${tl} is ${alt[tl]}`);
  expect(Boolean(alt["x-default"]), where, "no x-default");
  const sw = langSwitch(h);
  expect(sw.includes(`href="${to}"`), where, `language switch does not link ${to}`);
  expect(
    !sw.includes("data-translation-missing"),
    where,
    "language switch claims the translation is missing",
  );
  const sm = sitemapEntry(from);
  expect(sm.includes(`hreflang="${tl}" href="${SITE}${to}"`), where, "sitemap entry without the alternate");
  expect(
    h.includes(`"workTranslation":{"@id":"${SITE}${to}#post"}`),
    where,
    "JSON-LD without workTranslation",
  );
  expect(feedHas(fl, from) && !feedHas(tl, from), where, `must be in the ${fl} feed only`);
  expect(indexed(from)?.l === fl, where, "search index entry missing or wrong language");
  expect(text("llms.txt").includes(`(${SITE}${from})`), where, "missing in llms.txt");
  // The other language's listing shows its own version, not this one.
  expect(!html(`/${tl}/blog/`).includes(`href="${from}"`), where, `listed in the ${tl} blog index as well`);
}

function checkSingle(url) {
  const lang = url.split("/")[1];
  const other = lang === "de" ? "en" : "de";
  const where = `single ${url}`;
  const h = html(url);
  expect(h !== "", where, "page missing");
  const alt = hreflangs(h);
  expect(Object.keys(alt).length === 0, where, `has hreflang alternates: ${Object.keys(alt).join(", ")}`);
  const sw = langSwitch(h);
  expect(
    sw.includes(`href="/${other}/blog/"`) && sw.includes("data-translation-missing"),
    where,
    `language switch does not lead to /${other}/blog/ marked as missing`,
  );
  expect(!/xhtml:link/.test(sitemapEntry(url)), where, "sitemap entry with alternates");
  expect(sitemapEntry(url) !== "", where, "not in the sitemap");
  expect(!h.includes("workTranslation"), where, "JSON-LD claims a translation");
  expect(feedHas(lang, url) && !feedHas(other, url), where, `must be in the ${lang} feed only`);
  expect(indexed(url)?.l === lang, where, "search index entry missing or wrong language");
  expect(text("llms.txt").includes(`(${SITE}${url})`), where, "missing in llms.txt");
  // Discoverable from the other language, marked as foreign.
  const listing = html(`/${other}/blog/`);
  const item = listing.match(
    new RegExp(`<li class="entry" lang="${lang}">(?:(?!</li>).)*href="${url}"(?:(?!</li>).)*</li>`, "s"),
  )?.[0];
  expect(Boolean(item), where, `not listed (with lang="${lang}") in /${other}/blog/`);
  expect(Boolean(item?.includes('class="badge"')), where, `no "only in" badge in /${other}/blog/`);
}

checkPair("/de/blog/fixture-geplant/", "/en/blog/fixture-scheduled/");
checkPair("/en/blog/fixture-scheduled/", "/de/blog/fixture-geplant/");
checkSingle("/en/blog/fixture-english-only/");

// The real content: every post is either part of a pair or a single, and must
// behave like one (both directions, whatever the current articles are).
const keyOf = (path) => {
  const fm = read(path).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return fm.match(/^translationKey:\s*(\S+)/m)?.[1] ?? basename(path, ".md");
};
const posts = { de: new Map(), en: new Map() };
for (const lang of ["de", "en"]) {
  const dir = join("src/content/blog", lang);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const url = `/${lang}/blog/${basename(name, ".md")}/`;
    const fm = read(join(dir, name)).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    if (/^draft:\s*true\s*$/m.test(fm)) continue;
    posts[lang].set(keyOf(join(dir, name)), url);
  }
}
let pairs = 0;
let singles = 0;
for (const [lang, other] of [
  ["de", "en"],
  ["en", "de"],
]) {
  for (const [key, url] of posts[lang]) {
    const counterpart = posts[other].get(key);
    if (counterpart) {
      checkPair(url, counterpart);
      pairs++;
    } else {
      checkSingle(url);
      singles++;
    }
  }
}

r.done(
  `fixture pair (both directions) + English-only fixture; real posts: ${pairs} pair direction(s), ${singles} single(s)`,
);
