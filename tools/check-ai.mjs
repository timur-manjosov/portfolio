// AI-facing artefacts (brief R6 §2.5 B), on the production build dist/:
//
//  1. llms.txt has the llmstxt.org shape: one H1 with the name, the summary
//     blockquote (= the English home description), free text without
//     headings, H2 sections of "- [name](url): sentence" entries, "Optional"
//     last; every link exists in the build; every public post is listed.
//  2. llms-full.txt: every public post once (title + URL), nothing else
//     that is a post, below 1.5 MB.
//  3. Markdown twins: every <link rel="alternate" type="text/markdown">
//     points at a file whose header matches the page (title = <h1>, url =
//     canonical, date = the visible published date, language = <html lang>)
//     and whose text has about as many words as the page's text (±15 %).
//  4. robots.txt lists both crawler groups of src/data/crawlers.ts with the
//     rule of their switch; flipping a switch (pure function, no build)
//     changes exactly that group to "Disallow: /".
//  5. No scheduled post in any artefact: a production build dated the day
//     before the newest post must not mention any post dated after that day
//     in any file (HTML, XML, JSON, TXT, Markdown) nor ship its page, twin
//     or Open Graph image.
//
//   node tools/check-ai.mjs
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { crawlers } from "../src/data/crawlers.ts";
import { robotsTxt } from "../src/lib/robots.ts";
import { isScheduled, resolveBuildDay } from "../src/lib/schedule.ts";
import { reporter, walk } from "./lib.mjs";

const r = reporter("AI artefacts (llms.txt, llms-full.txt, Markdown twins, robots.txt)");
const SITE = "https://timurmanjosov.com";
const D = "dist";
let checks = 0;
const expect = (cond, where, msg) => {
  checks++;
  if (!cond) r.fail(where, msg);
};
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
const htmlText = (html) =>
  decode(
    html
      .replace(/<annotation[\s\S]*?<\/annotation>/g, " ")
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
const fileOf = (url) => {
  const path = url.startsWith(SITE) ? url.slice(SITE.length) : url;
  return join(D, path.endsWith("/") ? `${path}index.html` : path);
};

// Public posts from the sources (same rule as the build).
const today = resolveBuildDay();
const allPosts = [];
for (const lang of ["de", "en"]) {
  for (const f of readdirSync(`src/content/blog/${lang}`).filter((n) => n.endsWith(".md"))) {
    const fm = parseYaml(
      readFileSync(`src/content/blog/${lang}/${f}`, "utf8").match(/^---\n([\s\S]*?)\n---/)[1],
    );
    const date = fm.date instanceof Date ? fm.date : new Date(fm.date);
    allPosts.push({ lang, slug: f.slice(0, -3), url: `/${lang}/blog/${f.slice(0, -3)}/`, ...fm, date });
  }
}
const publicPosts = allPosts.filter((p) => !p.draft && !isScheduled(p.date, today));

// ---- 1. llms.txt --------------------------------------------------------
{
  const llms = read(join(D, "llms.txt"));
  const lines = llms.split("\n");
  const enHome =
    read(join(D, "en/index.html")).match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  expect(lines[0] === "# Timur Manjosov", "llms.txt", "first line is not the H1 with the name");
  expect(lines.filter((l) => /^# /.test(l)).length === 1, "llms.txt", "more than one H1");
  const quote = lines.find((l) => l.startsWith("> "));
  expect(quote === `> ${decode(enHome)}`, "llms.txt", "blockquote ≠ the English home description");
  const h2 = lines.filter((l) => /^## /.test(l));
  expect(h2.length >= 3, "llms.txt", "fewer than three H2 sections");
  expect(h2.at(-1) === "## Optional", "llms.txt", "the last section is not ## Optional");
  expect(!lines.some((l) => /^#{3,} /.test(l)), "llms.txt", "headings below H2");
  const firstH2 = lines.findIndex((l) => /^## /.test(l));
  for (const l of lines.slice(firstH2)) {
    if (!l || /^## /.test(l)) continue;
    const m = l.match(/^- \[([^\]]+)\]\((https:\/\/[^)\s]+)\): (.+)$/);
    expect(Boolean(m), "llms.txt", `entry without "- [name](url): sentence": ${l.slice(0, 80)}`);
    if (m) expect(existsSync(fileOf(m[2])), "llms.txt", `link target missing in the build: ${m[2]}`);
  }
  for (const p of publicPosts)
    expect(llms.includes(`(${SITE}${p.url})`), "llms.txt", `post ${p.url} not listed`);
}

// ---- 2. llms-full.txt ---------------------------------------------------
{
  const file = join(D, "llms-full.txt");
  const full = read(file);
  expect(full.length > 0, "llms-full.txt", "missing");
  const size = existsSync(file) ? statSync(file).size : 0;
  expect(size < 1.5 * 1024 * 1024, "llms-full.txt", `${(size / 1024).toFixed(0)} KB (limit 1.5 MB)`);
  const urls = [...full.matchAll(/^url: (\S+)$/gm)].map((m) => m[1]);
  expect(
    urls.length === publicPosts.length,
    "llms-full.txt",
    `${urls.length} posts, expected ${publicPosts.length}`,
  );
  for (const p of publicPosts) {
    expect(urls.includes(`${SITE}${p.url}`), "llms-full.txt", `lacks ${p.url}`);
    expect(
      full.includes(`title: ${JSON.stringify(p.title)}`),
      "llms-full.txt",
      `lacks the title of ${p.url}`,
    );
  }
}

// ---- 3. Markdown twins --------------------------------------------------
/** Inner HTML of the first <div class="prose"> (balanced over nested divs). */
function prose(html) {
  const start = html.indexOf('<div class="prose">');
  if (start < 0) return "";
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return "";
}
/** Words after one normalisation for both sides: punctuation and hyphens split. */
const PUNCT = /[-–—_/{}()[\]\\^$*#>|`~,.;:!?"„“”‚‘’'=+<]/g;
const words = (t) =>
  t
    .replace(PUNCT, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** Markdown as read: no front matter, no title line, no link targets, no TeX commands. */
const mdWords = (md) =>
  words(
    md
      .replace(/^---\n[\s\S]*?\n---\n/, "")
      .replace(/^# .*\n/m, "")
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/\\[a-zA-Z]+/g, " "),
  );
const htmlWords = (html) => words(htmlText(html));

let twins = 0;
for (const file of walk(D).filter((f) => f.endsWith("index.html"))) {
  const html = read(file);
  const href = html.match(/<link rel="alternate" type="text\/markdown" title="Markdown" href="([^"]+)"/)?.[1];
  if (!href) continue;
  twins++;
  const where = href;
  const md = read(join(D, href));
  if (!md) {
    r.fail(where, "twin file missing");
    continue;
  }
  const head = parseYaml(md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "");
  const h1 = htmlText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const lang = html.match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
  expect(head.title === h1, where, `title "${head.title}" ≠ <h1> "${h1}"`);
  expect(head.url === canonical, where, `url ${head.url} ≠ canonical ${canonical}`);
  expect(head.language === lang, where, `language ${head.language} ≠ ${lang}`);
  expect(head.author === "Timur Manjosov", where, "author missing");
  const published = html.match(/<p class="byline">[\s\S]*?<time datetime="([^"]+)"/)?.[1];
  const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));
  if (published) expect(iso(head.date) === published, where, `date ${iso(head.date)} ≠ visible ${published}`);
  const a = mdWords(md);
  const b = htmlWords(prose(html));
  expect(
    b > 0 && Math.abs(a - b) / b <= 0.15,
    where,
    `text size differs: ${a} words in Markdown, ${b} on the page`,
  );
}
expect(twins >= publicPosts.length, "twins", `only ${twins} pages link a Markdown twin`);

// ---- 4. robots.txt ------------------------------------------------------
{
  const robots = read(join(D, "robots.txt"));
  expect(robots === robotsTxt(crawlers, SITE), "robots.txt", "differs from src/data/crawlers.ts");
  const groups = robots.split(/\n\n/);
  for (const [name, g] of Object.entries(crawlers)) {
    const block = groups.find((b) => b.includes(`User-agent: ${g.agents[0].token}`)) ?? "";
    for (const a of g.agents)
      expect(block.includes(`User-agent: ${a.token}\n`), "robots.txt", `${name}: ${a.token} missing`);
    expect(block.includes(g.allow ? "\nAllow: /" : "\nDisallow: /"), "robots.txt", `${name}: rule ≠ switch`);
  }
  expect(/User-agent: \*\nAllow: \/\n/.test(robots), "robots.txt", "no allowing default group");
  expect(robots.includes(`Sitemap: ${SITE}/sitemap.xml`), "robots.txt", "no Sitemap line");
  // The switch: training off → exactly the training group disallowed.
  const off = robotsTxt({ ...crawlers, training: { ...crawlers.training, allow: false } }, SITE);
  const offGroups = off.split(/\n\n/);
  const block = (gs, token) => gs.find((b) => b.includes(`User-agent: ${token}\n`)) ?? "";
  expect(
    block(offGroups, "GPTBot").endsWith("Disallow: /"),
    "robots switch",
    "training off does not disallow GPTBot",
  );
  expect(
    block(offGroups, "OAI-SearchBot").endsWith("Allow: /"),
    "robots switch",
    "training off touched search",
  );
  expect(
    off.split("\n").filter((l) => l === "Disallow: /").length === 1,
    "robots switch",
    "more than one group disallowed",
  );
}

// ---- 5. no scheduled post in any artefact -------------------------------
{
  const dated = allPosts.filter((p) => !p.draft).sort((a, b) => b.date - a.date);
  const newest = dated[0];
  if (newest) {
    const day = new Date(newest.date.valueOf() - 86400000).toISOString().slice(0, 10);
    const out = ".cache/check-ai/scheduled";
    const res = spawnSync("node", ["tools/build.mjs", "--build-date", day, "--out-dir", out], {
      encoding: "utf8",
    });
    expect(res.status === 0, "scheduled build", `build failed:\n${res.stdout}\n${res.stderr}`.slice(-800));
    const hidden = allPosts.filter((p) => !p.draft && isScheduled(p.date, day));
    expect(hidden.length > 0, "scheduled build", "no post is scheduled at the test date");
    const files = walk(out).filter((f) => /\.(html|xml|json|txt|md)$/.test(f));
    for (const p of hidden) {
      expect(!existsSync(join(out, p.url)), p.url, "page directory exists (page or twin)");
      expect(!existsSync(join(out, `og${p.url.replace(/\/$/, "")}.png`)), p.url, "Open Graph image exists");
      for (const f of files) {
        const t = read(f);
        if (t.includes(p.url) || t.includes(p.title) || t.includes(JSON.stringify(p.title).slice(1, -1)))
          r.fail(p.url, `scheduled post mentioned in ${f.slice(out.length)}`);
      }
      checks += files.length;
    }
  }
}

r.done(
  `${checks} checks: llms.txt shape, llms-full.txt (${publicPosts.length} posts), ${twins} Markdown twins, robots.txt + switch, no scheduled post in any artefact`,
);
