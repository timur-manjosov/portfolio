// Scheduled publishing (brief R5 §2.3): a post dated after the build day
// (Europe/Berlin) is completely absent from a production build and visible,
// marked "scheduled", in dev and test builds.
//
//   node tools/check-scheduled.mjs
//
// 1. Unit tests of src/lib/schedule.ts (the same file Astro uses): days,
//    instants, the midnight boundary in summer and winter time, invalid input.
// 2. Production builds with the fixtures (tests/fixtures/blog/*/fixture-*),
//    whose pair is dated 2030-06-15, at five build dates: yesterday, today,
//    tomorrow, one second before and exactly at midnight Berlin time. Before
//    the day: no page, no URL, no title anywhere (lists, tags, categories,
//    feeds, sitemap, search index, llms.txt, JSON-LD); from the day on: there.
// 3. dist-drafts (test build): the pair is shown with the "scheduled" badge,
//    as noindex, and is not in its sitemap.
// 4. The real content: every post in src/content/blog dated after today is
//    absent from dist/ (the production build of `npm run check`).
//
// Builds go to .cache/scheduled/ (git-ignored), ~2 s each.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { isScheduled, postDay, resolveBuildDay } from "../src/lib/schedule.ts";
import { read, reporter, walk } from "./lib.mjs";

const r = reporter("scheduled posts");
const expect = (cond, where, msg) => {
  if (!cond) r.fail(where, msg);
};
let units = 0;
const eq = (actual, wanted, what) => {
  units++;
  expect(
    actual === wanted,
    "unit",
    `${what}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(wanted)}`,
  );
};
const throws = (fn, what) => {
  units++;
  try {
    fn();
    r.fail("unit", `${what}: did not throw`);
  } catch {}
};

// ---- 1. unit tests --------------------------------------------------------
eq(resolveBuildDay("2030-06-15"), "2030-06-15", "day override");
eq(resolveBuildDay(undefined, new Date("2026-10-29T10:00:00Z")), "2026-10-29", "no override = today");
eq(resolveBuildDay("", new Date("2026-10-29T10:00:00Z")), "2026-10-29", "empty override = today");
// Summer time (CEST, UTC+2): midnight Berlin = 22:00 UTC the day before.
eq(resolveBuildDay("2030-06-14T21:59:59Z"), "2030-06-14", "23:59:59 CEST");
eq(resolveBuildDay("2030-06-14T22:00:00Z"), "2030-06-15", "00:00:00 CEST");
// Winter time (CET, UTC+1): midnight Berlin = 23:00 UTC the day before.
eq(resolveBuildDay("2026-11-04T22:59:59Z"), "2026-11-04", "23:59:59 CET");
eq(resolveBuildDay("2026-11-04T23:00:00Z"), "2026-11-05", "00:00:00 CET");
// The machine's time zone does not matter: a UTC late-evening build is the next Berlin day.
eq(resolveBuildDay(undefined, new Date("2026-12-31T23:30:00Z")), "2027-01-01", "new year in Berlin first");
eq(postDay(new Date("2030-06-15")), "2030-06-15", "bare frontmatter date");
eq(postDay(new Date("2030-06-15T23:30:00+02:00")), "2030-06-15", "timestamp late in the Berlin day");
eq(isScheduled(new Date("2030-06-15"), "2030-06-14"), true, "post tomorrow");
eq(isScheduled(new Date("2030-06-15"), "2030-06-15"), false, "post today");
eq(isScheduled(new Date("2030-06-15"), "2030-06-16"), false, "post yesterday");
throws(() => resolveBuildDay("2030-02-30"), "impossible day");
throws(() => resolveBuildDay("tomorrow"), "free text");
throws(() => resolveBuildDay("2030-6-15"), "unpadded day");

// ---- 2. production builds at five build dates ---------------------------
const OUT = ".cache/scheduled";
rmSync(OUT, { recursive: true, force: true });
const PAIR = [
  {
    url: "/de/blog/fixture-geplant/",
    title: "[Fixture] Geplanter Beitrag",
    tag: "/de/blog/tags/fixture-geplant/",
  },
  {
    url: "/en/blog/fixture-scheduled/",
    title: "[Fixture] A scheduled post",
    tag: "/en/blog/tags/fixture-scheduled/",
  },
];

function build(name, buildDate) {
  const out = join(OUT, name);
  const res = spawnSync(
    "node",
    ["tools/build.mjs", "--fixtures", "--build-date", buildDate, "--out-dir", out],
    {
      encoding: "utf8",
    },
  );
  expect(res.status === 0, name, `build failed:\n${res.stdout}\n${res.stderr}`.slice(-800));
  return out;
}
const outputs = (dir) => walk(dir).filter((f) => /\.(html|xml|json|txt)$/.test(f));
const page = (dir, url) => join(dir, url, "index.html");
const has = (dir, file, needle) => existsSync(join(dir, file)) && read(join(dir, file)).includes(needle);

function expectAbsent(name, dir) {
  for (const p of PAIR) {
    expect(!existsSync(page(dir, p.url)), name, `page ${p.url} exists`);
    expect(!existsSync(page(dir, p.tag)), name, `tag page ${p.tag} exists`);
    for (const f of outputs(dir)) {
      const text = read(f);
      if (text.includes(p.url)) r.fail(name, `${f} references ${p.url}`);
      if (text.includes(p.title) || text.includes(JSON.stringify(p.title).slice(1, -1)))
        r.fail(name, `${f} contains "${p.title}"`);
    }
  }
}
function expectPresent(name, dir) {
  const [de, en] = PAIR;
  for (const p of PAIR) {
    expect(existsSync(page(dir, p.url)), name, `page ${p.url} missing`);
    expect(existsSync(page(dir, p.tag)), name, `tag page ${p.tag} missing`);
    expect(has(dir, "sitemap.xml", p.url), name, `sitemap lacks ${p.url}`);
    expect(has(dir, "search-index.json", p.url), name, `search index lacks ${p.url}`);
    expect(has(dir, "llms.txt", p.url), name, `llms.txt lacks ${p.url}`);
    expect(!/content="noindex"/.test(read(page(dir, p.url))), name, `${p.url} is noindex`);
    expect(
      !/class="badge">(Geplant|Scheduled)</.test(read(page(dir, p.url))),
      name,
      `${p.url} still marked scheduled`,
    );
  }
  expect(has(dir, "de/feed.xml", de.url), name, "German feed lacks the post");
  expect(has(dir, "en/feed.xml", en.url), name, "English feed lacks the post");
  expect(has(dir, "de/blog/index.html", de.url), name, "German blog index lacks the post");
  expect(has(dir, "de/blog/category/notes/index.html", de.url), name, "category page lacks the post");
  expect(/"@type":"BlogPosting"/.test(read(page(dir, de.url))), name, "no BlogPosting JSON-LD");
}

const CASES = [
  ["yesterday", "2030-06-14", false],
  ["today", "2030-06-15", true],
  ["tomorrow", "2030-06-16", true],
  ["before-midnight", "2030-06-14T21:59:59Z", false],
  ["at-midnight", "2030-06-14T22:00:00Z", true],
];
for (const [name, date, visible] of CASES) {
  const dir = build(name, date);
  if (visible) expectPresent(name, dir);
  else expectAbsent(name, dir);
}

// ---- 3. dist-drafts: visible, marked, noindex, not in the sitemap ---------
const drafts = "dist-drafts";
if (resolveBuildDay(undefined) < "2030-06-15") {
  for (const p of PAIR) {
    const html = existsSync(page(drafts, p.url)) ? read(page(drafts, p.url)) : "";
    expect(html !== "", drafts, `scheduled post ${p.url} missing (build:drafts without --fixtures?)`);
    expect(/class="badge">(Geplant|Scheduled)</.test(html), drafts, `${p.url} has no "scheduled" badge`);
    expect(/<meta name="robots" content="noindex"/.test(html), drafts, `${p.url} is not noindex`);
    expect(!has(drafts, "sitemap.xml", p.url), drafts, `sitemap lists the scheduled ${p.url}`);
  }
}

// ---- 4. the real content in dist/ ----------------------------------------
const today = resolveBuildDay(undefined);
let future = 0;
for (const lang of ["de", "en"]) {
  const dir = join("src/content/blog", lang);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    const fm = read(file).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const date = fm.match(/^date:\s*"?([^"\s]+)"?\s*$/m)?.[1];
    if (!date || !isScheduled(new Date(date), today)) continue;
    future++;
    const url = `/${lang}/blog/${basename(file, ".md")}/`;
    const title = fm.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
    expect(!existsSync(join("dist", url)), "dist", `scheduled ${url} (date ${date}) was built`);
    for (const f of outputs("dist")) {
      const text = read(f);
      if (text.includes(url)) r.fail("dist", `${f} references the scheduled ${url}`);
      else if (title.length > 8 && text.includes(title))
        r.fail("dist", `${f} contains the scheduled "${title}"`);
    }
  }
}

r.done(
  `${units} unit tests; ${CASES.length} production builds (yesterday/today/tomorrow/midnight ±1 s) with the fixture pair; ` +
    `dist-drafts marks it; ${future} real post(s) dated after ${today} absent from dist/`,
);
