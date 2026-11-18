// Test of tools/verify-live.mjs (brief R6 §2.9): the local server
// (tools/serve.mjs, production headers and redirects) serves dist/, and a
// small proxy in front of it breaks one thing per case. verify:live must
// pass the intact site and report each break as a FEHLER with exit code 1.
//
// Cases: intact; a security header missing; 'unsafe-inline' in the CSP; a
// page of the sitemap missing; a not-found page answering 200; a scheduled
// post reachable (the newest public post, with "today" set to the day
// before its date).
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { parse as parseYaml } from "yaml";
import { reporter } from "./lib.mjs";
import { startServer } from "./serve.mjs";

const r = reporter("verify:live against a local server");
const dist = process.argv[2] ?? "dist";
const upstream = await startServer(dist, 0);
const origin = `http://127.0.0.1:${upstream.address().port}`;

// The newest public post: with "today" one day before its date it counts as
// scheduled, yet dist/ (built today) contains it.
const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
let newest = null;
for (const lang of ["de", "en"]) {
  for (const f of readdirSync(`src/content/blog/${lang}`).filter((n) => n.endsWith(".md"))) {
    const fm = parseYaml(
      readFileSync(`src/content/blog/${lang}/${f}`, "utf8").match(/^---\n([\s\S]*?)\n---/)[1],
    );
    const date = new Date(fm.date).toISOString().slice(0, 10);
    if (!fm.draft && date <= day && (!newest || date > newest.date))
      newest = { url: `/${lang}/blog/${f.slice(0, -3)}/`, date };
  }
}
const before = new Date(Date.parse(`${newest.date}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);

/** A proxy to the local server that applies `change` to every response. */
function proxy(change) {
  const server = createServer(async (req, res) => {
    const headers = {};
    if (req.headers["accept-language"]) headers["accept-language"] = req.headers["accept-language"];
    const up = await fetch(origin + req.url, { redirect: "manual", headers });
    const out = {
      status: up.status,
      headers: new Headers(up.headers),
      body: Buffer.from(await up.arrayBuffer()),
    };
    out.headers.delete("content-length");
    out.headers.delete("content-encoding");
    change(req.url, out);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(out.body);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function run(base, extra = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["tools/verify-live.mjs", "--base", base, ...extra], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });
    child.on("close", (code) => resolve({ code, output }));
  });
}

const cases = [
  { name: "intact", change: () => {}, code: 0, expect: "FEHLER: keine" },
  {
    name: "header missing",
    change: (_, o) => o.headers.delete("x-content-type-options"),
    code: 1,
    expect: "Header X-Content-Type-Options fehlt",
  },
  {
    name: "CSP weakened",
    change: (_, o) => {
      const csp = o.headers.get("content-security-policy");
      if (csp)
        o.headers.set(
          "content-security-policy",
          csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"),
        );
    },
    code: 1,
    expect: "CSP erlaubt 'unsafe-…'",
  },
  {
    name: "page missing",
    change: (url, o) => {
      if (url === "/en/about/") {
        o.status = 404;
        o.body = Buffer.from("gone");
      }
    },
    code: 1,
    expect: "/en/about/: Status 404",
  },
  {
    name: "soft 404",
    change: (_, o) => {
      if (o.status === 404) o.status = 200;
    },
    code: 1,
    expect: "statt 404",
  },
  {
    name: "scheduled post reachable",
    change: () => {},
    args: ["--today", before],
    code: 1,
    expect: `${newest.url}: geplanter Artikel (Datum nach ${before}) erreichbar`,
  },
];

let passed = 0;
for (const c of cases) {
  const server = await proxy(c.change);
  const { code, output } = await run(`http://127.0.0.1:${server.address().port}`, c.args);
  server.close();
  if (c.name === "intact" && process.argv.includes("--show")) console.log(output);
  if (code !== c.code) r.fail(c.name, `exit code ${code}, expected ${c.code}\n${output}`);
  else if (!output.includes(c.expect)) r.fail(c.name, `output lacks "${c.expect}"\n${output}`);
  else passed++;
}
upstream.close();
r.done(
  `${passed}/${cases.length} cases: intact site passes; missing header, weakened CSP, missing page, soft 404, reachable scheduled post (${newest.url} with today ${before}) are reported`,
);
