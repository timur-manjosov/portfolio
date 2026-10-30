// Exit codes of `npm run check:prepush` (brief R5 §2.9): the start script
// pushes only on exit code 0, so GO must be 0 and every NO-GO non-zero.
// Runs tools/check-prepush.mjs in throw-away repositories:
//
//   node tools/check-prepush-exit.mjs
//
//   GO (only noreply commits)                        → 0, prints "GO:"
//   NO-GO (a commit with a private address)           → 1, prints "NO-GO:"
//   NO-GO (a server path in an added line)            → 1
//   NO-GO (a private file that cannot be read)        → 1 (fail closed)
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
  const commit = (file, text, email) => {
    writeFileSync(join(dir, file), text);
    git("add", file);
    git("-c", "user.name=Test", "-c", `user.email=${email}`, "commit", "-q", "-m", `add ${file}`);
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

  p = check(a.dir, "--bogus");
  expect(p.status === 2, "usage error", `exit ${p.status}`);
  p = check(a.dir, "--base", "no-such-ref");
  expect(p.status === 2, "unknown ref", `exit ${p.status}`);
} finally {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
}

r.done(`${cases} cases: GO → 0, NO-GO (address, server path, unreadable private file) → 1, usage → 2`);
