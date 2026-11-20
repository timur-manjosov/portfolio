// `npm run audit`: fails on every advisory of severity moderate or worse,
// except the ones listed in EXCEPTIONS below. An exception is only for an
// advisory that (a) has no patched version at all and (b) cannot reach a
// visitor, because the package runs at build time only (the site is static
// files behind Caddy; Node never runs on the server). Each exception expires
// by itself: as soon as the package publishes a version newer than the last
// vulnerable one, or the advisory's range changes, this check fails and asks
// for an update instead. Reasons and alternatives: docs/DECISIONS.md R6-D15.
// Before the real audit, five synthetic reports prove that the rules bite.
import { execFileSync } from "node:child_process";
import { reporter } from "./lib.mjs";

const EXCEPTIONS = [
  {
    ghsa: "GHSA-fc5q-39xc-vjpf",
    pkg: "picomatch",
    range: "<=4.0.7",
    lastVulnerable: "4.0.7",
    why:
      "ReDoS when an attacker controls both the glob pattern and the matched string; " +
      "here picomatch only matches the repository's own globs against its own file paths " +
      "(Astro content loaders, Vite, tinyglobby) at build time. No patched version exists " +
      "(advisory 2026-10-19, updated 2026-11-17).",
  },
];
const BLOCKING = new Set(["moderate", "high", "critical"]);

/** Problems and notes for one `npm audit --json` report. */
export function evaluate(report, exceptions, latestOf) {
  const problems = [];
  const notes = [];
  // The advisories themselves are the object entries of `via`; string
  // entries only say "depends on a vulnerable package".
  const advisories = new Map();
  for (const v of Object.values(report.vulnerabilities ?? {})) {
    for (const a of v.via ?? []) {
      if (typeof a !== "object") continue;
      const id = String(a.url ?? "")
        .split("/")
        .pop();
      advisories.set(id, { id, pkg: a.name, severity: a.severity, range: a.range, title: a.title });
    }
  }
  for (const a of advisories.values()) {
    if (!BLOCKING.has(a.severity)) {
      notes.push(`${a.id} (${a.pkg}, ${a.severity})`);
      continue;
    }
    const ex = exceptions.find((e) => e.ghsa === a.id && e.pkg === a.pkg);
    if (!ex) problems.push(`${a.id}: ${a.pkg} ${a.range}, ${a.severity}: ${a.title}`);
    else if (a.range !== ex.range)
      problems.push(
        `${a.id}: the advisory now covers ${a.pkg} ${a.range} (exception written for ${ex.range}); review it`,
      );
  }
  const excepted = [];
  for (const ex of exceptions) {
    if (!advisories.has(ex.ghsa)) {
      notes.push(`exception ${ex.ghsa} no longer reported, remove it`);
      continue;
    }
    const latest = latestOf(ex.pkg);
    if (latest !== ex.lastVulnerable)
      problems.push(
        `${ex.ghsa}: ${ex.pkg} ${latest} is published (last vulnerable: ${ex.lastVulnerable}); update, check whether it fixes the advisory, then drop the exception`,
      );
    else excepted.push(`${ex.ghsa} (${ex.pkg}, build time only, no fix published)`);
  }
  return { problems, notes, excepted, count: advisories.size };
}

const r = reporter("npm audit (moderate and above)");

// Self-test: the rules must bite.
const adv = (name, severity, range, ghsa) => ({
  vulnerabilities: {
    [name]: {
      via: [{ name, severity, range, title: "t", url: `https://github.com/advisories/${ghsa}` }, "other"],
    },
  },
});
const ex = [{ ghsa: "GHSA-test", pkg: "p", range: "<=1.0.0", lastVulnerable: "1.0.0" }];
const cases = [
  ["excepted, no fix published", adv("p", "high", "<=1.0.0", "GHSA-test"), () => "1.0.0", 0],
  ["not excepted", adv("q", "moderate", "*", "GHSA-other"), () => "1.0.0", 1],
  ["fix published", adv("p", "high", "<=1.0.0", "GHSA-test"), () => "1.0.1", 1],
  ["range changed", adv("p", "high", "<=1.0.1", "GHSA-test"), () => "1.0.0", 1],
  ["low only", adv("q", "low", "*", "GHSA-low"), () => "1.0.0", 0],
];
for (const [name, report, latestOf, want] of cases) {
  const got = evaluate(report, ex, latestOf).problems.length;
  if (got !== want) r.fail("self-test", `${name}: ${got} problem(s), expected ${want}`);
}

function npm(args) {
  try {
    return execFileSync("npm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    // npm audit exits 1 when it finds anything; the JSON is still on stdout.
    if (e.stdout) return e.stdout;
    throw e;
  }
}

const report = JSON.parse(npm(["audit", "--json"]));
if (report.error) {
  r.fail("npm audit", report.error.summary ?? "no report (offline?)");
  r.done("");
} else {
  const res = evaluate(report, EXCEPTIONS, (pkg) => npm(["view", pkg, "version"]).trim());
  for (const p of res.problems) r.fail("advisory", p);
  r.done(
    `${cases.length} self-test cases; ${res.count} advisory(ies), none blocking` +
      (res.excepted.length ? `; excepted: ${res.excepted.join(", ")}` : "") +
      (res.notes.length ? `; notes: ${res.notes.join(", ")}` : ""),
  );
}
