// Leak check for the private data layer (README, "Private data").
//
//   node tools/check-private.mjs [--private <file>]... [--staged-only]
//
// For every private file (default: every *.yaml in private/, so the real
// file and the test file are both covered), takes each value that must stay
// out of the repository (tools/private-data.mjs → secretValues) and searches
//   - every tracked file as it is in the working tree (git ls-files),
//   - every untracked file that is not ignored (what `git add -A` would add),
//   - the staged version of every file in the index (what the next commit
//     contains, even if the working tree differs).
// Any hit is an error. The value itself is never printed, only the field it
// came from and where it was found.
//
// Without any private file the check skips itself with a notice (CI, fresh
// clones). --staged-only searches only the index (used by .githooks/pre-commit).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { reporter } from "./lib.mjs";
import { loadPrivateFile, PrivateDataError, secretValues } from "./private-data.mjs";

const args = process.argv.slice(2);
const files = [];
let stagedOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--private" && args[i + 1]) files.push(args[++i]);
  else if (args[i] === "--staged-only") stagedOnly = true;
  else {
    console.error(`unknown argument: ${args[i]}`);
    process.exit(2);
  }
}
if (!files.length && existsSync("private")) {
  for (const name of readdirSync("private").sort()) {
    if (/\.ya?ml$/.test(name)) files.push(join("private", name));
  }
}

const r = reporter("private data leak check");
if (!files.length) {
  console.log("- private data leak check: skipped (no private/*.yaml; nothing to compare against)");
  process.exit(0);
}

const secrets = [];
for (const file of files) {
  try {
    for (const s of secretValues(loadPrivateFile(file))) secrets.push({ ...s, file });
  } catch (error) {
    if (!(error instanceof PrivateDataError)) throw error;
    r.fail(file, error.message.split("\n")[0]);
  }
}

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const list = (out) => out.split("\0").filter(Boolean);

/** [label, content] pairs to search. Binary files are skipped. */
const haystack = [];
const addText = (label, buf) => {
  if (buf.includes(0)) return; // binary
  haystack.push([label, buf.toString("utf8")]);
};
if (!stagedOnly) {
  const worktree = [
    ...list(git("ls-files", "-z")),
    ...list(git("ls-files", "-z", "--others", "--exclude-standard")),
  ];
  for (const path of worktree) {
    if (existsSync(path) && statSync(path).isFile()) addText(path, readFileSync(path));
  }
}
for (const path of list(git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"))) {
  addText(`${path} (staged)`, execFileSync("git", ["show", `:${path}`], { maxBuffer: 64 * 1024 * 1024 }));
}

// Also case-insensitive for e-mail addresses and URLs.
const norm = (v) => v.toLowerCase();
const lowered = haystack.map(([label, text]) => [label, norm(text)]);
for (const s of secrets) {
  const needle = norm(s.value);
  for (const [label, text] of lowered) {
    if (text.includes(needle)) r.fail(label, `contains the value of ${s.field} from ${s.file}`);
  }
}

r.done(
  `${secrets.length} private value(s) from ${files.length} file(s) not found in ${haystack.length} ${
    stagedOnly ? "staged" : "tracked/staged/unignored"
  } file(s)`,
);
