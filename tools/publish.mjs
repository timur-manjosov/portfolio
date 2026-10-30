// npm run publish: content updates after the first go-live, one command.
//
//   npm run publish -- --target <ssh-target>             build, show changes, confirm, publish
//   npm run publish -- --target <ssh-target> --dry-run   build and show changes; nothing on the server changes
//   npm run publish -- --target <ssh-target> --rollback  back to the previous published release
//   npm run publish -- --target-dir <dir> …              the same against a local directory (tests)
//
// Steps (docs/PUBLISHING.md):
//   1. preflight: clean git tree (--allow-dirty warns), branch from
//      deploy/site-config.json `publish.branches` (--any-branch warns),
//      private file present
//   2. deploy/build-release.sh (npm ci, npm run check incl. check:private,
//      release build with the private file); --release <id|dir> reuses a
//      built release instead
//   3. changes against the live release: new, changed and removed URLs,
//      scheduled posts with their dates, a warning if /now changed without
//      a new `updated`
//   4. confirmation (--yes skips it), upload of the content only to
//      ~/deploy-staging/publish/<id>/, then deploy/publish-on-server.sh
//      --apply (with sudo; --no-sudo if the web root belongs to the SSH user)
//   5. that script switches `current`, checks over HTTP (200 for the changed
//      URLs, security headers and CSP as configured) and switches back on a
//      failure
//
// The Caddyfile is never changed and Caddy is never reloaded. Before
// uploading, the live Caddyfile is read (read-only) and compared with what
// deploy/site-config.json generates: if the site block would change, publish
// stops and points to ./ship.sh, the only way Caddy changes.
// Never runs `git push`.
//
// Exit codes: 0 done (or nothing to do), 1 failed, 2 usage error.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";
import { isScheduled, resolveBuildDay } from "../src/lib/schedule.ts";
import { nowUpdateWarning } from "./now-check.mjs";
import { startServer } from "./serve.mjs";

const ROOT = resolve(import.meta.dirname, "..");
process.chdir(ROOT);
const SCRIPT = "deploy/publish-on-server.sh";
const WORK = ".cache/publish";
const ID_RE = /^[0-9]{8}T[0-9]{6}Z-[0-9a-f]+$/;
const config = JSON.parse(readFileSync("deploy/site-config.json", "utf8")).publish ?? {};

class UsageError extends Error {}
const say = (s = "") => console.log(s);
const warn = (s) => console.warn(`WARNING: ${s}`);

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      target: { type: "string" },
      "target-dir": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      rollback: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      "allow-dirty": { type: "boolean", default: false },
      "any-branch": { type: "boolean", default: false },
      private: { type: "string", default: "private/site.private.yaml" },
      release: { type: "string" },
      keep: { type: "string" },
      "no-sudo": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  }));
} catch (e) {
  console.error(`usage error: ${e.message}`);
  process.exit(2);
}

// --- small helpers -------------------------------------------------------------
/** Runs a command; resolves with its exit code (and stdout if `capture`). */
function run(cmd, args, { capture = false, input, env, quiet = false } = {}) {
  return new Promise((done, reject) => {
    const child = spawn(cmd, args, {
      stdio: [
        input === undefined ? "inherit" : "pipe",
        capture ? "pipe" : "inherit",
        quiet ? "ignore" : "inherit",
      ],
      env: env ?? process.env,
    });
    let out = "";
    if (capture) child.stdout.on("data", (d) => (out += d));
    if (input !== undefined) child.stdin.end(input);
    child.on("error", reject);
    child.on("close", (code) => done({ code: code ?? 1, out }));
  });
}
async function must(cmd, args, what, options) {
  const r = await run(cmd, args, options);
  if (r.code !== 0) throw new Error(`${what} failed (exit ${r.code})`);
  return r.out;
}
const git = async (...args) => (await run("git", args, { capture: true })).out.trim();
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function parseManifest(text) {
  const state = { current: null, history: [], files: new Map() };
  for (const line of text.split("\n")) {
    if (line.startsWith("CURRENT ")) state.current = line.slice(8);
    else if (line.startsWith("HISTORY ")) state.history.push(line.slice(8));
    else if (line.startsWith("FILE ")) {
      const [hash, ...rest] = line.slice(5).split("  ");
      state.files.set(rest.join("  "), hash);
    }
  }
  if (!state.current) throw new Error("could not read the state of the web root");
  return state;
}
function parseHashes(text) {
  const files = new Map();
  for (const line of text.split("\n").filter(Boolean)) {
    const [hash, ...rest] = line.split("  ");
    files.set(rest.join("  "), hash);
  }
  return files;
}
const urlOf = (path) =>
  path === "index.html"
    ? "/"
    : path.endsWith("/index.html")
      ? `/${path.slice(0, -"index.html".length)}`
      : `/${path}`;

// --- target ----------------------------------------------------------------------
const sshTarget = opts.target ?? process.env.PUBLISH_SSH_TARGET;
const targetDir = opts["target-dir"] ? resolve(opts["target-dir"]) : null;
try {
  if (opts.help) {
    say(
      readFileSync(new URL(import.meta.url), "utf8")
        .split("\n")
        .slice(0, 32)
        .join("\n"),
    );
    process.exit(0);
  }
  if (Boolean(sshTarget) === Boolean(targetDir))
    throw new UsageError(
      "exactly one target: --target <ssh-target> (or PUBLISH_SSH_TARGET) or --target-dir <dir>",
    );
  // The SSH target ends up as an ssh argument: no options, no shell characters.
  if (sshTarget && !/^[A-Za-z0-9][A-Za-z0-9._@-]*$/.test(sshTarget))
    throw new UsageError(`unusual SSH target: ${sshTarget}`);
  if (opts["no-sudo"] && targetDir)
    throw new UsageError("--no-sudo is for the server; --target-dir never uses sudo");
  if (opts.rollback && opts.release) throw new UsageError("--rollback and --release exclude each other");
} catch (e) {
  console.error(`usage error: ${e.message}`);
  process.exit(2);
}
const keep = Number(opts.keep ?? config.keep ?? 5);
if (!Number.isInteger(keep) || keep < 2 || keep > 50) {
  console.error("usage error: --keep must be an integer between 2 and 50");
  process.exit(2);
}
const remote = (cmd) => ["-o", "BatchMode=yes", sshTarget, cmd];

/** State of the live web root, read-only (the script is piped, nothing is written). */
async function liveState() {
  const script = readFileSync(SCRIPT, "utf8");
  const r = targetDir
    ? await run("bash", [SCRIPT, "--manifest", "--local", "--web-root", targetDir], { capture: true })
    : await run("ssh", remote("bash -s -- --manifest"), { capture: true, input: script });
  if (r.code !== 0) throw new Error("reading the web root failed (see above)");
  return parseManifest(r.out);
}

/** The live Caddyfile must already contain exactly the block this repository generates. */
async function checkCaddyUnchanged() {
  if (targetDir) return say("Caddyfile: not checked (local target)");
  mkdirSync(WORK, { recursive: true });
  const live = await must("ssh", remote("cat /etc/caddy/Caddyfile"), "reading the live Caddyfile", {
    capture: true,
  });
  writeFileSync(`${WORK}/Caddyfile.live`, live);
  const r = await run(
    "node",
    ["tools/caddy-site-block.mjs", "propose", `${WORK}/Caddyfile.live`, `${WORK}/Caddyfile.proposed`],
    { capture: true },
  );
  if (r.code !== 0 || readFileSync(`${WORK}/Caddyfile.proposed`, "utf8") !== live)
    throw new Error(
      "the Caddy site block would change (headers, redirects or caching in deploy/site-config.json differ from the live server). publish only changes content: use ./ship.sh for this release (docs/DEPLOY.md).",
    );
  say("Caddyfile: live block matches deploy/site-config.json, stays untouched");
}

/** Local test server on <target-dir>/current, so the script can check over HTTP. */
async function withLocalServer(fn) {
  const server = await startServer(join(targetDir, "current"), 0);
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

async function confirm(question) {
  if (opts.yes) return true;
  if (!process.stdin.isTTY) throw new Error("no terminal to confirm on; pass --yes");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim();
  rl.close();
  return answer === "y" || answer === "Y";
}

// --- rollback ----------------------------------------------------------------------
async function rollback() {
  const state = await liveState();
  const history = state.history;
  if (history.length < 2)
    throw new Error(`no earlier published release on the target (history: ${history.join(", ")})`);
  const prev = history[history.length - 2];
  say(`live: ${state.current}`);
  say(`rollback to: ${prev}`);
  if (opts["dry-run"]) return say("dry run: nothing changed.");
  if (!(await confirm(`Switch back to ${prev}?`))) return say("aborted, nothing changed.");
  const stage = `${WORK}/stage/rollback`;
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  await must("node", ["tools/caddy-site-block.mjs", "smoke-data", stage], "writing expected headers", {
    capture: true,
  });
  copyFileSync(SCRIPT, `${stage}/publish-on-server.sh`);
  if (targetDir) {
    const code = await withLocalServer(
      async (url) =>
        (
          await run("bash", [
            SCRIPT,
            "--rollback",
            "--local",
            "--web-root",
            targetDir,
            "--base-url",
            url,
            "--stage-dir",
            stage,
          ])
        ).code,
    );
    if (code !== 0) throw new Error("rollback failed; the live release is unchanged");
    return;
  }
  const dir = "deploy-staging/publish/rollback";
  await must("ssh", remote(`mkdir -p ${dir}`), "creating the staging directory");
  await must(
    "scp",
    [
      "-q",
      "-o",
      "BatchMode=yes",
      `${stage}/publish-on-server.sh`,
      `${stage}/expected-headers.tsv`,
      `${sshTarget}:${dir}/`,
    ],
    "upload",
  );
  const sudo = opts["no-sudo"] ? [] : ["sudo"];
  const r = await run("ssh", ["-t", sshTarget, ...sudo, "bash", `${dir}/publish-on-server.sh`, "--rollback"]);
  if (r.code !== 0) throw new Error("rollback failed; the live release is unchanged");
}

// --- publish -------------------------------------------------------------------------
async function preflight() {
  const status = await git("status", "--porcelain");
  if (status) {
    if (!opts["allow-dirty"])
      throw new Error("the working tree has uncommitted changes; commit first (or --allow-dirty)");
    warn(
      "--allow-dirty: publishing a state that is not committed. The release id names a commit that does not contain it.",
    );
  }
  const branch = await git("rev-parse", "--abbrev-ref", "HEAD");
  const branches = config.branches ?? ["main"];
  if (!branches.includes(branch)) {
    if (!opts["any-branch"])
      throw new Error(
        `branch ${branch} is not in publish.branches (${branches.join(", ")}); switch branch or pass --any-branch`,
      );
    warn(`--any-branch: publishing from ${branch}`);
  }
  if (!opts.release && !existsSync(opts.private))
    throw new Error(`${opts.private} not found: fill it in first (docs/GO-LIVE.md, step 1)`);
}

async function releaseDir() {
  if (opts.release) {
    const dir = existsSync(opts.release) ? resolve(opts.release) : resolve("release", opts.release);
    if (!ID_RE.test(basename(dir))) throw new Error(`not a release id or directory: ${opts.release}`);
    if (!existsSync(join(dir, "site.tar.gz"))) throw new Error(`${dir}/site.tar.gz not found`);
    return dir;
  }
  const args = ["deploy/build-release.sh", "--private", opts.private, "--github-meta"];
  if (opts["allow-dirty"]) args.push("--allow-dirty");
  await must("bash", args, "deploy/build-release.sh");
  return resolve("release", readFileSync("release/LATEST", "utf8").trim());
}

function frontmatter(file) {
  const m = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  return m ? (parseYaml(m[1]) ?? {}) : {};
}

function scheduledPosts() {
  const today = resolveBuildDay(undefined);
  const out = [];
  for (const lang of ["de", "en"]) {
    const dir = `src/content/blog/${lang}`;
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      const fm = frontmatter(join(dir, f));
      if (fm.draft === true || !fm.date) continue;
      const date = new Date(fm.date);
      if (isScheduled(date, today))
        out.push({ day: date.toISOString().slice(0, 10), id: `${lang}/${f.slice(0, -3)}`, title: fm.title });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

/** /now changed since the published commit, but `updated` did not: probably forgotten. */
async function nowWarnings(liveId) {
  const commit = liveId.match(/-([0-9a-f]+)$/)?.[1];
  if (
    !commit ||
    (await run("git", ["cat-file", "-e", `${commit}^{commit}`], { capture: true, quiet: true })).code !== 0
  )
    return [`/now: the live release's commit is not in this repository, so /now was not compared`];
  const out = [];
  for (const lang of ["de", "en"]) {
    const file = `src/content/pages/${lang}/now.md`;
    if (!existsSync(file)) continue;
    const before = await run("git", ["show", `${commit}:${file}`], { capture: true, quiet: true });
    if (before.code !== 0) continue;
    const warning = nowUpdateWarning(file, before.out, readFileSync(file, "utf8"));
    if (warning) out.push(warning);
  }
  return out;
}

function summary(live, next) {
  const pages = { added: [], changed: [], removed: [] };
  const other = { added: [], changed: [], removed: [] };
  let assets = 0;
  const bucket = (path) => (path.startsWith("_astro/") ? null : path.endsWith(".html") ? pages : other);
  for (const [path, hash] of next) {
    const old = live.get(path);
    if (old === hash) continue;
    const b = bucket(path);
    if (!b) assets++;
    else (old === undefined ? b.added : b.changed).push(path);
  }
  for (const path of live.keys()) {
    if (next.has(path)) continue;
    const b = bucket(path);
    if (!b) assets++;
    else b.removed.push(path);
  }
  return { pages, other, assets };
}

function printList(label, paths, limit = 25) {
  say(`  ${label} (${paths.length})${paths.length ? ":" : ""}`);
  for (const p of paths.slice(0, limit)) say(`    ${urlOf(p)}`);
  if (paths.length > limit) say(`    … and ${paths.length - limit} more`);
}

async function publish() {
  await preflight();
  // A given release is checked before anything else; a new one is built
  // after the cheap checks of the target.
  let dir = opts.release ? await releaseDir() : null;
  const isTestOnly = (d) => existsSync(join(d, "TEST-ONLY"));
  if (dir && isTestOnly(dir) && !targetDir)
    throw new Error(`${basename(dir)} is a TEST-ONLY release; it is never published to the server`);
  const state = await liveState();
  say(`live release: ${state.current}`);
  await checkCaddyUnchanged();

  dir ??= await releaseDir();
  const id = basename(dir);
  const testOnly = isTestOnly(dir);
  if (testOnly && !targetDir)
    throw new Error(`${id} is a TEST-ONLY release; it is never published to the server`);
  if (id === state.current) return say(`${id} is already live; nothing to do.`);

  // Hash the new build with the same script that hashes the live one.
  const unpacked = `${WORK}/new/${id}`;
  rmSync(unpacked, { recursive: true, force: true });
  mkdirSync(unpacked, { recursive: true });
  await must("tar", ["-xzf", join(dir, "site.tar.gz"), "-C", unpacked], "unpacking the build");
  const next = parseHashes(
    await must("bash", [SCRIPT, "--manifest-of", unpacked], "hashing the build", { capture: true }),
  );
  const diff = summary(state.files, next);

  say();
  say(`Changes from ${state.current} to ${id}:`);
  printList("new pages", diff.pages.added);
  printList("changed pages", diff.pages.changed);
  printList("removed pages", diff.pages.removed);
  printList(
    "other files new or changed (feeds, sitemap, search index, …)",
    [...diff.other.added, ...diff.other.changed],
    10,
  );
  if (diff.other.removed.length) printList("other files removed", diff.other.removed, 10);
  say(`  assets (_astro/) added or removed: ${diff.assets}`);
  const scheduled = scheduledPosts();
  say();
  say(`Scheduled posts, not in this build (they appear with the first publish on or after their date):`);
  if (!scheduled.length) say("  none");
  for (const p of scheduled) say(`  ${p.day}  ${p.id}  ${JSON.stringify(p.title)}`);
  for (const w of await nowWarnings(state.current)) warn(w);
  say();

  const check = [...diff.pages.added, ...diff.pages.changed, ...diff.other.added, ...diff.other.changed]
    .map(urlOf)
    // "/" is the language door (302), and 404 pages are checked by the script.
    .filter((u) => u !== "/" && !/(^|\/)404(\.html|\/)$/.test(u))
    .slice(0, 300);
  const changes =
    diff.pages.added.length +
    diff.pages.changed.length +
    diff.pages.removed.length +
    diff.other.added.length +
    diff.other.changed.length +
    diff.other.removed.length +
    diff.assets;
  if (!changes) say("The new build has the same content as the live release.");

  if (opts["dry-run"]) {
    say(
      `dry run: would upload ${id}, switch current from ${state.current} to ${id} and keep ${keep} releases.`,
    );
    say("Nothing was uploaded or changed.");
    return;
  }
  if (!(await confirm(`Publish ${id} (${check.length} URLs to check)?`)))
    return say("aborted, nothing changed.");

  // Stage: content only, with checksums.
  const stage = resolve(WORK, "stage", id);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  copyFileSync(join(dir, "site.tar.gz"), `${stage}/site.tar.gz`);
  if (existsSync(join(dir, "expected-headers.tsv")))
    copyFileSync(join(dir, "expected-headers.tsv"), `${stage}/expected-headers.tsv`);
  else
    await must("node", ["tools/caddy-site-block.mjs", "smoke-data", stage], "writing expected headers", {
      capture: true,
    });
  copyFileSync(SCRIPT, `${stage}/publish-on-server.sh`);
  writeFileSync(`${stage}/check-urls.txt`, check.length ? `${check.join("\n")}\n` : "");
  const files = ["site.tar.gz", "expected-headers.tsv", "check-urls.txt", "publish-on-server.sh"];
  if (testOnly) {
    copyFileSync(join(dir, "TEST-ONLY"), `${stage}/TEST-ONLY`);
    files.push("TEST-ONLY");
  }
  writeFileSync(
    `${stage}/PUBLISH.SHA256SUMS`,
    files.map((f) => `${sha256(`${stage}/${f}`)}  ${f}\n`).join(""),
  );

  let code;
  if (targetDir) {
    code = await withLocalServer(
      async (url) =>
        (
          await run("bash", [
            SCRIPT,
            "--apply",
            "--local",
            "--web-root",
            targetDir,
            "--base-url",
            url,
            "--stage-dir",
            stage,
            "--keep",
            String(keep),
          ])
        ).code,
    );
  } else {
    const remoteDir = `deploy-staging/publish/${id}`;
    await must("ssh", remote(`mkdir -p ${remoteDir}`), "creating the staging directory");
    const paths = [...files, "PUBLISH.SHA256SUMS"].map((f) => `${stage}/${f}`);
    await must("scp", ["-q", "-o", "BatchMode=yes", ...paths, `${sshTarget}:${remoteDir}/`], "upload");
    const sudo = opts["no-sudo"] ? [] : ["sudo"];
    code = (
      await run("ssh", [
        "-t",
        sshTarget,
        ...sudo,
        "bash",
        `${remoteDir}/publish-on-server.sh`,
        "--apply",
        "--keep",
        String(keep),
      ])
    ).code;
  }
  if (code !== 0) throw new Error(`publishing ${id} failed; the previous release ${state.current} is live`);
  if (!targetDir) writeFileSync("release/PUBLISHED", `${id}\n`);
  say(`published: ${id}. Back with: npm run publish -- --rollback`);
}

try {
  await (opts.rollback ? rollback() : publish());
} catch (e) {
  console.error(`\npublish: ${e.message}`);
  process.exitCode = e instanceof UsageError ? 2 : 1;
}
