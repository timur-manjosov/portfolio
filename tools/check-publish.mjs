// Tests of `npm run publish` without a server (brief R5 §2.4): the real
// tools/publish.mjs and deploy/publish-on-server.sh against a local web root
// with the layout of the first go-live (releases/<id>/, `current` symlink),
// served over HTTP by tools/serve.mjs with the configured headers.
//
//   node tools/check-publish.mjs        (needs dist/ from `npm run build`)
//
// Covered: dry run changes nothing; upload + switch; the change overview;
// automatic switch back when the HTTP check fails; rollback (twice: the
// second has nothing to go back to); pruning to --keep; re-publishing a
// release left over from a rollback; the deletion guards (empty, relative,
// root, top-level, `..`, short web root; missing releases/, `current` not a
// symlink); a checksum mismatch; usage errors. Not covered (needs the server):
// SSH, sudo, the comparison with the live Caddyfile.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reporter } from "./lib.mjs";
import { nowUpdateWarning } from "./now-check.mjs";

const r = reporter("publish (local target)");
let cases = 0;
const expect = (cond, where, msg) => {
  cases++;
  if (!cond) r.fail(where, msg);
};
if (!existsSync("dist/de/index.html")) {
  console.error("✗ publish: dist/ missing, run `npm run build` first");
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "check-publish-"));
const web = join(tmp, "web");
const ids = {
  a: "20261030T100000Z-aaaaaaaaaaaa",
  b: "20261030T110000Z-bbbbbbbbbbbb",
  broken: "20261030T120000Z-cccccccccccc",
  d: "20261030T130000Z-dddddddddddd",
  e: "20261030T140000Z-eeeeeeeeeeee",
};

/** A release directory like deploy/build-release.sh makes, from a copy of dist/. */
function release(id, change = () => {}) {
  const site = join(tmp, "site", id);
  cpSync("dist", site, { recursive: true });
  change(site);
  const dir = join(tmp, "releases-src", id);
  mkdirSync(dir, { recursive: true });
  run("tar", ["--sort=name", "-C", site, "-czf", join(dir, "site.tar.gz"), "."]);
  run("node", ["tools/caddy-site-block.mjs", "smoke-data", dir]);
  return dir;
}
function run(cmd, args) {
  const p = spawnSync(cmd, args, { encoding: "utf8" });
  if (p.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${p.stderr}`);
  return p.stdout;
}
const publish = (...args) =>
  spawnSync(
    "node",
    ["tools/publish.mjs", "--target-dir", web, "--yes", "--allow-dirty", "--any-branch", ...args],
    {
      encoding: "utf8",
    },
  );
const script = (...args) => spawnSync("bash", ["deploy/publish-on-server.sh", ...args], { encoding: "utf8" });
const current = () => readlinkSync(join(web, "current"));
const history = () =>
  existsSync(join(web, "releases/HISTORY"))
    ? readFileSync(join(web, "releases/HISTORY"), "utf8").trim().split("\n")
    : [];
const releasesOnDisk = () =>
  readdirSync(join(web, "releases"))
    .filter((n) => /^\d{8}T/.test(n))
    .sort();
const out = (p) => `${p.stdout}\n${p.stderr}`.trim().split("\n").slice(-6).join(" | ");
// --verbose prints what publish prints, for reading the output once.
const show = (label, p) =>
  process.argv.includes("--verbose") &&
  console.log(`--- ${label} (exit ${p.status})\n${p.stdout}${p.stderr}`);

try {
  const srcA = release(ids.a);
  const srcB = release(ids.b, (site) => {
    cpSync(join(site, "de/now"), join(site, "de/neu-im-test"), { recursive: true });
    const now = join(site, "en/now/index.html");
    writeFileSync(now, readFileSync(now, "utf8").replace("</main>", "<p>changed in the test</p></main>"));
  });
  // Passes every precondition, fails the HTTP check: /de/blog/ is missing.
  const srcBroken = release(ids.broken, (site) => rmSync(join(site, "de/blog/index.html")));
  const srcD = release(ids.d);
  const srcE = release(ids.e);

  // The state after the first go-live through ./ship.sh.
  mkdirSync(join(web, "releases", ids.a), { recursive: true });
  run("tar", ["-xzf", join(srcA, "site.tar.gz"), "-C", join(web, "releases", ids.a)]);
  symlinkSync(`releases/${ids.a}`, join(web, "current"));

  // 1. Dry run: overview, nothing changes.
  let p = publish("--release", srcB, "--dry-run");
  show("dry run", p);
  expect(p.status === 0, "dry run", `exit ${p.status}: ${out(p)}`);
  expect(current() === `releases/${ids.a}`, "dry run", "current changed");
  expect(!existsSync(join(web, "releases", ids.b)), "dry run", "release unpacked");
  expect(!existsSync(join(web, "releases/HISTORY")), "dry run", "HISTORY written");
  expect(/new pages \(1\):\s+\/de\/neu-im-test\//.test(p.stdout), "dry run", "new page not listed");
  expect(/changed pages \(1\):\s+\/en\/now\//.test(p.stdout), "dry run", "changed page not listed");
  expect(/Scheduled posts/.test(p.stdout), "dry run", "no section for scheduled posts");

  // 2. Publish B.
  p = publish("--release", srcB);
  expect(p.status === 0, "publish", `exit ${p.status}: ${out(p)}`);
  expect(current() === `releases/${ids.b}`, "publish", `current is ${current()}`);
  expect(history().join() === [ids.a, ids.b].join(), "publish", `history ${history()}`);
  expect(/2 new or changed URL\(s\) checked/.test(p.stdout), "publish", "changed URLs not checked over HTTP");
  expect(existsSync(join(web, "current/de/neu-im-test/index.html")), "publish", "new page not served");

  // 3. A release that fails the HTTP check: switched back, removed.
  p = publish("--release", srcBroken);
  show("failed check", p);
  expect(p.status === 1, "failed check", `exit ${p.status}: ${out(p)}`);
  expect(current() === `releases/${ids.b}`, "failed check", `current is ${current()}`);
  expect(!existsSync(join(web, "releases", ids.broken)), "failed check", "broken release left behind");
  expect(history().join() === [ids.a, ids.b].join(), "failed check", `history ${history()}`);
  expect(/\/de\/blog\/: HTTP 404/.test(p.stderr), "failed check", "failure not reported");

  // 4. Rollback, dry run first.
  p = publish("--rollback", "--dry-run");
  expect(p.status === 0 && current() === `releases/${ids.b}`, "rollback dry run", out(p));
  p = publish("--rollback");
  expect(p.status === 0, "rollback", `exit ${p.status}: ${out(p)}`);
  expect(current() === `releases/${ids.a}`, "rollback", `current is ${current()}`);
  expect(history().join() === ids.a, "rollback", `history ${history()}`);
  p = publish("--rollback");
  expect(
    p.status === 1 && current() === `releases/${ids.a}`,
    "second rollback",
    `exit ${p.status}: ${out(p)}`,
  );

  // 5. B again (its directory is left over from the rollback), then D and E
  //    with --keep 2: only the newest two stay.
  p = publish("--release", srcB);
  expect(p.status === 0 && current() === `releases/${ids.b}`, "re-publish", out(p));
  p = publish("--release", srcD, "--keep", "2");
  expect(p.status === 0, "keep", out(p));
  p = publish("--release", srcE, "--keep", "2");
  expect(p.status === 0 && current() === `releases/${ids.e}`, "keep", out(p));
  expect(releasesOnDisk().join() === [ids.d, ids.e].join(), "keep", `on disk: ${releasesOnDisk()}`);
  expect(history().join() === [ids.d, ids.e].join(), "keep", `history ${history()}`);
  p = publish("--release", srcE);
  expect(p.status === 0 && /already live/.test(p.stdout), "same release", out(p));

  // 6. Deletion guards: every bad web root stops before anything happens.
  const base = ["--manifest", "--local", "--web-root"];
  for (const bad of ["", "/", "/tmp", "relative/web", `${web}/../web`, "/a/b", `${web}/`, `${web}/./x`]) {
    p = script(...base, bad);
    expect(p.status !== 0 && /refusing web root|needs/.test(p.stderr), `web root "${bad}"`, out(p));
  }
  for (const bad of ["", "/", "/tmp"]) {
    p = script(
      "--apply",
      "--local",
      "--web-root",
      bad,
      "--base-url",
      "http://127.0.0.1:9",
      "--stage-dir",
      srcB,
    );
    expect(
      p.status !== 0 && /refusing web root|needs/.test(p.stderr),
      `apply with web root "${bad}"`,
      out(p),
    );
  }
  const noReleases = join(tmp, "no-releases");
  mkdirSync(noReleases);
  p = script(...base, noReleases);
  expect(p.status === 1 && /releases missing/.test(p.stderr), "no releases/", out(p));
  const plainCurrent = join(tmp, "plain-current");
  mkdirSync(join(plainCurrent, "releases"), { recursive: true });
  mkdirSync(join(plainCurrent, "current"));
  p = script(...base, plainCurrent);
  expect(p.status === 1 && /not a symlink/.test(p.stderr), "current is a directory", out(p));

  // 7. A staged release whose checksum does not match: nothing changes.
  const stage = join(tmp, "stage", ids.d);
  cpSync(srcD, stage, { recursive: true });
  cpSync("deploy/publish-on-server.sh", join(stage, "publish-on-server.sh"));
  writeFileSync(join(stage, "check-urls.txt"), "");
  writeFileSync(
    join(stage, "PUBLISH.SHA256SUMS"),
    ["site.tar.gz", "expected-headers.tsv", "check-urls.txt", "publish-on-server.sh"]
      .map((f) => `${"0".repeat(64)}  ${f}\n`)
      .join(""),
  );
  const before = current();
  p = script(
    "--apply",
    "--local",
    "--web-root",
    web,
    "--base-url",
    "http://127.0.0.1:9",
    "--stage-dir",
    stage,
  );
  expect(
    p.status === 1 && /precondition/.test(p.stderr) && current() === before,
    "checksum mismatch",
    out(p),
  );

  // 8. Usage errors (exit 2).
  for (const args of [[], ["--target", "-oProxyCommand=x"], ["--target", "host", "--target-dir", web]]) {
    p = spawnSync("node", ["tools/publish.mjs", ...args], {
      encoding: "utf8",
      env: { ...process.env, PUBLISH_SSH_TARGET: "" },
    });
    expect(p.status === 2, `usage ${JSON.stringify(args)}`, `exit ${p.status}: ${out(p)}`);
  }
  p = script("--apply", "--keep", "1", "--local", "--web-root", web);
  expect(p.status === 2, "keep 1", out(p));

  // 9. The /now warning: text changed, `updated` kept → warn; both changed or
  //    nothing changed → quiet.
  const nowA = "---\ntitle: Now\nupdated: 2026-10-30\n---\n\nA\n";
  expect(nowUpdateWarning("now.md", nowA, nowA.replace("A\n", "B\n")) !== null, "/now", "no warning");
  expect(
    nowUpdateWarning("now.md", nowA, nowA.replace("A\n", "B\n").replace("10-30", "11-02")) === null,
    "/now",
    "warning although updated changed",
  );
  expect(nowUpdateWarning("now.md", nowA, nowA) === null, "/now", "warning without a change");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

r.done(
  `${cases} cases: dry run, upload + switch, change overview, switch back on a failed HTTP check, rollback, --keep, deletion guards, checksums, usage`,
);
