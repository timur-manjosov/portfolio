// Exit codes of `npm run check:prepush` (brief R5 §2.9): the start script
// pushes only on exit code 0, so GO must be 0 and every NO-GO non-zero.
// Runs tools/check-prepush.mjs in throw-away repositories:
//
//   node tools/check-prepush-exit.mjs
//
//   GO (only noreply commits)                        → 0, prints "GO:"
//   GO (six noreply commits since origin/main)        → 0
//   NO-GO (a commit with a private address)           → 1, prints "NO-GO:"
//   NO-GO (private committer in the middle of eight)  → 1, names that commit
//   NO-GO (a server path in an added line)            → 1
//   NO-GO (a private file that cannot be read)        → 1 (fail closed)
//   GO (SVG path data, published user-agent names)    → 0; controls → 1
//   usage error, unknown ref                          → 2
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { reporter } from "./lib.mjs";

const r = reporter("check:prepush exit codes");
let cases = 0;
const expect = (cond, where, msg) => {
  cases++;
  if (!cond) r.fail(where, msg);
};
const SCRIPT = resolve(import.meta.dirname, "check-prepush.mjs");
const NOREPLY = "1+someone@users.noreply.github.com";

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "check-prepush-exit-"));
  const git = (...args) => {
    const p = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (p.status !== 0) throw new Error(`git ${args.join(" ")}: ${p.stderr}`);
    return p.stdout.trim();
  };
  git("init", "-q", "-b", "main");
  // The check reads the public facts from src/data/site.ts (untracked here).
  mkdirSync(join(dir, "src/data"), { recursive: true });
  copyFileSync(resolve(import.meta.dirname, "../src/data/site.ts"), join(dir, "src/data/site.ts"));
  const commit = (file, text, email, committerEmail = email) => {
    writeFileSync(join(dir, file), text);
    git("add", file);
    const p = spawnSync(
      "git",
      ["-c", "user.name=Test", "-c", `user.email=${email}`, "commit", "-q", "-m", `add ${file}`],
      { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_COMMITTER_EMAIL: committerEmail } },
    );
    if (p.status !== 0) throw new Error(`git commit: ${p.stderr}`);
    return git("rev-parse", "HEAD");
  };
  return { dir, git, commit };
}
const check = (dir, ...args) => spawnSync("node", [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });

const dirs = [];
try {
  const a = repo();
  dirs.push(a.dir);
  const base = a.commit("README.md", "base\n", NOREPLY);
  a.commit("a.txt", "fine\n", NOREPLY);
  let p = check(a.dir, "--base", base);
  expect(p.status === 0 && /\nGO:/.test(p.stdout), "GO", `exit ${p.status}: ${p.stdout.slice(-300)}`);

  a.commit("b.txt", "also fine\n", "someone@example.org");
  p = check(a.dir, "--base", base);
  expect(p.status === 1 && /NO-GO:/.test(p.stdout), "private author address", `exit ${p.status}`);

  const b = repo();
  dirs.push(b.dir);
  const base2 = b.commit("README.md", "base\n", NOREPLY);
  // Assembled at run time: the literal in this file would itself be a finding.
  const serverPath = ["", "var", "www", "example-site", "current"].join("/");
  b.commit("notes.txt", `root is ${serverPath}\n`, NOREPLY);
  p = check(b.dir, "--base", base2);
  expect(
    p.status === 1 && /server path/.test(p.stdout),
    "server path",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );

  const c = repo();
  dirs.push(c.dir);
  const base3 = c.commit("README.md", "base\n", NOREPLY);
  c.commit("a.txt", "fine\n", NOREPLY);
  mkdirSync(join(c.dir, "private"));
  writeFileSync(join(c.dir, "private", "site.private.yaml"), "contact: [unclosed\n");
  p = check(c.dir, "--base", base3);
  expect(
    p.status === 1 && /not readable/.test(p.stdout),
    "unreadable private file",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );

  // Several commits since origin/main (the start script's case, R6 §2.8 d):
  // every commit is checked, the count does not matter. Without --base the
  // check uses origin/main.
  const d = repo();
  dirs.push(d.dir);
  d.commit("README.md", "base\n", NOREPLY);
  d.git("update-ref", "refs/remotes/origin/main", "HEAD");
  for (const n of [1, 2, 3, 4, 5, 6]) d.commit(`f${n}.txt`, `change ${n}\n`, NOREPLY);
  p = check(d.dir);
  expect(
    p.status === 0 && /6 commit\(s\) in origin\/main\.\.HEAD/.test(p.stdout) && /\nGO:/.test(p.stdout),
    "GO with six commits since origin/main",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );
  // One commit in the middle with a private committer address (the author is
  // fine): NO-GO, and the finding names that commit.
  const middle = d.commit("g.txt", "middle\n", NOREPLY, "someone@example.org");
  d.commit("h.txt", "after\n", NOREPLY);
  p = check(d.dir);
  expect(
    p.status === 1 && new RegExp(`${middle.slice(0, 8)}\\s+committer`).test(p.stdout),
    "NO-GO for a private committer in the middle of eight commits",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );

  // Two false positives found on 2026-11-18 (DECISIONS R6-D17): SVG path
  // data that reads like an IPv4 address, and the user-agent names that
  // robots.txt publishes, kept in a field called `token`. Both are GO; the
  // controls next to them stay NO-GO.
  const e = repo();
  dirs.push(e.dir);
  const base5 = e.commit("README.md", "base\n", NOREPLY);
  e.commit(
    "icon.svg",
    '<svg viewBox="0 0 24 24"><path d="M12 .5a11.5 11.5 0 0 0-3.64 1.26 3.36.96.1"/></svg>\n',
    NOREPLY,
  );
  e.commit(
    "src/data/crawlers.ts",
    'export const agents = [{ token: "Claude-SearchBot" }, { token: "Applebot-Extended" }];\n',
    NOREPLY,
  );
  p = check(e.dir, "--base", base5);
  expect(
    p.status === 0 && /\nGO:/.test(p.stdout),
    "GO with SVG path data and published user-agent names",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );
  // Assembled at run time: the literals in this file would themselves be findings.
  const address = [198, 18, 7, 9].join(".");
  e.commit("page.html", `<a href="http://${address}/"><svg><path d="M3.36.96.1"/></svg></a>\n`, NOREPLY);
  p = check(e.dir, "--base", base5);
  expect(
    p.status === 1 && /IPv4 address/.test(p.stdout),
    "NO-GO for an address next to path data",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );
  const fake = ["a1b2c3d4", "e5f6g7h8"].join("");
  e.commit("src/data/crawlers.ts", `export const agents = [{ token: "${fake}" }];\n`, NOREPLY);
  p = check(e.dir, "--base", base5);
  expect(
    p.status === 1 && /secret assignment/.test(p.stdout),
    "NO-GO for a token value that is not a user-agent name",
    `exit ${p.status}: ${p.stdout.slice(-300)}`,
  );

  p = check(a.dir, "--bogus");
  expect(p.status === 2, "usage error", `exit ${p.status}`);
  p = check(a.dir, "--base", "no-such-ref");
  expect(p.status === 2, "unknown ref", `exit ${p.status}`);
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}

r.done(
  `${cases} cases: GO → 0 (also with six commits since origin/main, SVG path data, published user-agent names), NO-GO (address, committer in the middle, server path, unreadable private file, IPv4 next to path data, non-user-agent token) → 1, usage → 2`,
);
