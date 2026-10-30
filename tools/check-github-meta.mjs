// GitHub metadata at build time (brief R5 §2.6, src/lib/github-meta.ts),
// tested with mocked API answers; never talks to GitHub.
//
//   node tools/check-github-meta.mjs
//
// 1. Units with a mocked fetch and clock: off by default, no `repo` field,
//    success (languages by size, at most four), cache within the TTL (no
//    request), expiry with an error / a rate limit (stale value used), rate
//    limit without a cache (left out), 404 and private (ignored, remembered),
//    no network, a corrupt or unwritable cache; hand-written values win.
// 2. Two real builds with a temporary project (`repo:` set, empty stack):
//    against a local mock API the chips show its languages; against a dead
//    port the build still succeeds and only the chips are missing.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGithubMeta, withGithubFacts } from "../src/lib/github-meta.ts";
import { reporter } from "./lib.mjs";

const r = reporter("GitHub metadata at build time");
let cases = 0;
const expect = (cond, where, msg) => {
  cases++;
  if (!cond) r.fail(where, msg);
};
const tmp = mkdtempSync(join(tmpdir(), "check-github-meta-"));
const HOUR = 3_600_000;

/** A fetch that answers from `routes` (path → [status, body, headers]) and counts calls. */
function mockFetch(routes) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const route = routes[new URL(url).pathname];
    if (route instanceof Error) throw route;
    const [status, body, headers = {}] = route ?? [404, { message: "Not Found" }];
    return new Response(JSON.stringify(body), { status, headers });
  };
  fn.calls = calls;
  return fn;
}
const OK = {
  "/repos/o/r": [
    200,
    { private: false, pushed_at: "2026-10-01T10:00:00Z", stargazers_count: 7, language: "Rust" },
  ],
  "/repos/o/r/languages": [200, { Python: 300, Rust: 900, Shell: 20, C: 50, Makefile: 5 }],
};
function meta({ routes, now = 0, cache = join(tmp, "cache.json"), enabled = true }) {
  const fetch = mockFetch(routes);
  const logs = [];
  const get = createGithubMeta({
    enabled,
    fetch,
    now: () => now,
    cacheFile: cache,
    ttlMs: 24 * HOUR,
    apiBase: "https://api.test",
    log: (m) => logs.push(m),
  });
  return { get, fetch, logs };
}

try {
  // off, or no repo: no request at all
  let m = meta({ routes: OK, enabled: false });
  expect(
    (await m.get("o/r")) === null && m.fetch.calls.length === 0,
    "off",
    "fetched while GITHUB_META is off",
  );
  m = meta({ routes: OK });
  expect((await m.get(undefined)) === null && m.fetch.calls.length === 0, "no repo", "fetched without repo");
  expect(
    (await m.get("not a repo")) === null && m.fetch.calls.length === 0,
    "bad repo",
    "fetched a bad value",
  );

  // success
  let v = await m.get("o/r");
  expect(v?.languages.join() === "Rust,Python,C,Shell", "success", JSON.stringify(v));
  expect(v?.stars === 7 && v?.pushedAt === "2026-10-01T10:00:00Z", "success", JSON.stringify(v));
  expect(m.fetch.calls.length === 2, "success", `${m.fetch.calls.length} requests`);
  await m.get("o/r");
  expect(m.fetch.calls.length === 2, "same build", "the same repo was fetched twice in one build");

  // within the TTL: from the cache, no request
  m = meta({ routes: OK, now: 23 * HOUR });
  v = await m.get("o/r");
  expect(v?.languages[0] === "Rust" && m.fetch.calls.length === 0, "cache", "requested within 24 h");

  // expired + server error / rate limit: the stale value
  m = meta({ routes: { "/repos/o/r": [500, {}] }, now: 25 * HOUR });
  v = await m.get("o/r");
  expect(v?.languages[0] === "Rust" && m.fetch.calls.length === 1, "expired + 500", JSON.stringify(v));
  expect(/using the cached value/.test(m.logs.join()), "expired + 500", "no log line");
  m = meta({ routes: { "/repos/o/r": [403, {}, { "x-ratelimit-remaining": "0" }] }, now: 25 * HOUR });
  v = await m.get("o/r");
  expect(v?.languages[0] === "Rust" && /rate limit/.test(m.logs.join()), "rate limit", m.logs.join());
  m = meta({ routes: { "/repos/o/r": new TypeError("fetch failed") }, now: 25 * HOUR });
  v = await m.get("o/r");
  expect(v?.languages[0] === "Rust", "offline", JSON.stringify(v));

  // expired + success: refreshed
  m = meta({
    routes: { ...OK, "/repos/o/r/languages": [200, { Go: 10 }] },
    now: 25 * HOUR,
  });
  v = await m.get("o/r");
  expect(v?.languages.join() === "Go", "refresh", JSON.stringify(v));

  // no cache: rate limit and offline leave the field out
  const fresh = join(tmp, "fresh.json");
  m = meta({ routes: { "/repos/o/r": [429, {}] }, cache: fresh });
  expect((await m.get("o/r")) === null, "rate limit, no cache", "value invented");
  m = meta({ routes: { "/repos/o/r": new TypeError("fetch failed") }, cache: fresh });
  expect((await m.get("o/r")) === null, "offline, no cache", "value invented");

  // 404 and private: ignored silently and remembered
  m = meta({ routes: {}, cache: fresh });
  expect((await m.get("o/gone")) === null && m.logs.length === 0, "404", m.logs.join());
  m = meta({ routes: {}, cache: fresh, now: HOUR });
  expect((await m.get("o/gone")) === null && m.fetch.calls.length === 0, "404 remembered", "refetched");
  m = meta({ routes: { "/repos/o/p": [200, { private: true }] }, cache: fresh });
  expect((await m.get("o/p")) === null, "private", "private repo used");

  // a corrupt cache, and one that cannot be written: no crash
  const corrupt = join(tmp, "corrupt.json");
  writeFileSync(corrupt, "{not json");
  m = meta({ routes: OK, cache: corrupt });
  expect((await m.get("o/r"))?.languages[0] === "Rust", "corrupt cache", "lookup failed");
  writeFileSync(join(tmp, "a-file"), "");
  m = meta({ routes: OK, cache: join(tmp, "a-file", "cache.json") });
  expect((await m.get("o/r"))?.languages[0] === "Rust", "unwritable cache", "lookup failed");
  expect(/cache not written/.test(m.logs.join()), "unwritable cache", "no log line");

  // hand-written values win
  const facts = { pushedAt: "", stars: 1, languages: ["Rust"] };
  const base = { stack: [], links: {} };
  expect(withGithubFacts(base, facts) === base, "no repo field", "data changed without repo");
  let d = withGithubFacts({ ...base, repo: "o/r" }, facts);
  expect(d.stack.join() === "Rust" && d.links.repo === "https://github.com/o/r", "fill", JSON.stringify(d));
  d = withGithubFacts({ repo: "o/r", stack: ["Java"], links: { repo: "https://codeberg.org/x" } }, facts);
  expect(
    d.stack.join() === "Java" && d.links.repo === "https://codeberg.org/x",
    "manual wins",
    JSON.stringify(d),
  );
  d = withGithubFacts({ ...base, repo: "o/r" }, null);
  expect(d.stack.length === 0 && d.links.repo === "https://github.com/o/r", "no facts", JSON.stringify(d));

  // 2. real builds with a temporary project
  const probe = "src/content/projects/en/zz-github-meta-probe.md";
  const server = createServer((req, res) => {
    const route = {
      "/repos/timur-manjosov/probe": {
        private: false,
        pushed_at: "2026-10-01T00:00:00Z",
        stargazers_count: 3,
      },
      "/repos/timur-manjosov/probe/languages": { Rust: 900, Python: 300 },
    }[req.url ?? ""];
    res.writeHead(route ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify(route ?? { message: "Not Found" }));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const build = (apiBase, out) =>
    new Promise((done) => {
      const child = spawn("node", ["tools/build.mjs", "--out-dir", out], {
        env: {
          ...process.env,
          GITHUB_META: "1",
          GITHUB_API_BASE: apiBase,
          GITHUB_META_CACHE: `.cache/check-github-meta-${out.split("/").pop()}.json`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let log = "";
      child.stdout.on("data", (x) => (log += x));
      child.stderr.on("data", (x) => (log += x));
      child.on("close", (code) => done({ code, log }));
    });
  try {
    mkdirSync("src/content/projects/en", { recursive: true });
    writeFileSync(
      probe,
      '---\ntitle: "GitHub metadata probe"\nsummary: "Temporary file of tools/check-github-meta.mjs."\nstage: active\nrepo: timur-manjosov/probe\nupdated: 2026-10-30\n---\n\nProbe.\n',
    );
    for (const [label, api, chips] of [
      ["mock API", `http://127.0.0.1:${server.address().port}`, true],
      ["dead API", "http://127.0.0.1:9", false],
    ]) {
      const out = `.cache/github-meta-${chips ? "ok" : "dead"}`;
      rmSync(`.cache/check-github-meta-${out.split("/").pop()}.json`, { force: true });
      const b = await build(api, out);
      expect(b.code === 0, `build (${label})`, b.log.slice(-500));
      const page = join(out, "en/projects/zz-github-meta-probe/index.html");
      const html = existsSync(page) ? readFileSync(page, "utf8") : "";
      expect(
        html.includes('href="https://github.com/timur-manjosov/probe"'),
        `build (${label})`,
        "no source link",
      );
      const hasChips = /<li class="chip">Rust<\/li><li class="chip">Python<\/li>/.test(html);
      expect(hasChips === chips, `build (${label})`, chips ? "languages not shown" : "chips without data");
      rmSync(out, { recursive: true, force: true });
      rmSync(`.cache/check-github-meta-${out.split("/").pop()}.json`, { force: true });
    }
  } finally {
    rmSync(probe, { force: true });
    server.close();
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

r.done(
  `${cases} cases: off by default, mocked success/error/rate limit/expiry/404/private/offline, manual wins, two builds`,
);
