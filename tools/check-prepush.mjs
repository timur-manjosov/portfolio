// Pre-push check (brief R4 §2.6, docs/GO-LIVE.md "Before the push"): looks
// at every commit a push would upload and answers GO or NO-GO. Read-only:
// it runs git commands that only read, and changes nothing.
//
//   node tools/check-prepush.mjs [--base <ref>] [--head <ref>]
//
// Commits: <base>..<head>. Base: origin/main if it exists (what GitHub
// already has), else the tag pre-redesign; head: HEAD.
//
// Searched in every added line of every commit's diff and in every commit
// message:
//   1. values from the private data layer (private/*.yaml, via
//      tools/private-data.mjs, the same values as `npm run check:private`);
//   2. server details: IPv4/IPv6 addresses (not loopback or documentation
//      ranges), web-root and home paths (/var/www/…, /srv/… other than the
//      documented placeholders, /home/<user>/…, /root/…), and literals from
//      private/prepush-denylist.txt (git-ignored, one per line: SSH alias,
//      server user and host name, real web root) and from ~/.ssh/config
//      (Host aliases, HostName and User of every block that is not a code
//      host such as github.com), if that file exists;
//   3. token and key patterns (private keys, GitHub/GitLab/AWS/Slack/OpenAI/
//      Anthropic tokens, "secret = '…'" style assignments);
// and per commit:
//   4. author and committer e-mail: must be a GitHub noreply address
//      (…@users.noreply.github.com);
//   5. files that belong in .gitignore: .directory, release/, private/,
//      dist*/, .screenshots/, .tmp/ (added or changed by any commit).
//
// Findings name the commit, the file and the line; values are masked. Exit
// code 0 for GO, 1 for NO-GO, 2 for a usage error.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadPrivateFile, PrivateDataError, secretValues } from "./private-data.mjs";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
for (let i = 0; i < args.length; i += 2) {
  if (!["--base", "--head"].includes(args[i]) || !args[i + 1]) {
    console.error("usage: node tools/check-prepush.mjs [--base <ref>] [--head <ref>]");
    process.exit(2);
  }
}

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
const refExists = (ref) => {
  try {
    git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
const base = opt("--base") ?? (refExists("origin/main") ? "origin/main" : "pre-redesign");
const head = opt("--head") ?? "HEAD";
for (const ref of [base, head]) {
  if (!refExists(ref)) {
    console.error(`unknown ref: ${ref}`);
    process.exit(2);
  }
}

/** First two characters, then the length: enough to recognise, not to copy. */
const mask = (value) => {
  const v = String(value);
  if (v.includes("@")) {
    const [user, domain] = v.split("@");
    return `${user.slice(0, 2)}…@${domain.slice(0, 2)}…`;
  }
  return v.length <= 4 ? `${"*".repeat(v.length)}` : `${v.slice(0, 2)}…(${v.length} chars)`;
};

// ---- What to look for ----

const literals = []; // { value, what }
const notes = [];
// A private file whose values cannot be read cannot be searched for: that is
// a NO-GO (fail closed), not a note.
const unreadable = [];
if (existsSync("private")) {
  for (const name of readdirSync("private").sort()) {
    if (!/\.ya?ml$/.test(name)) continue;
    try {
      for (const s of secretValues(loadPrivateFile(join("private", name))))
        literals.push({ value: s.value, what: `private value ${s.field} (${name})` });
    } catch (error) {
      if (!(error instanceof PrivateDataError)) throw error;
      unreadable.push(`private/${name}: ${error.message.split("\n")[0]}`);
    }
  }
}
const denylist = join("private", "prepush-denylist.txt");
if (existsSync(denylist)) {
  for (const line of readFileSync(denylist, "utf8").split("\n")) {
    const value = line.trim();
    if (value && !value.startsWith("#"))
      literals.push({ value, what: "server detail (prepush-denylist.txt)" });
  }
} else notes.push(`${denylist} not found: only the generic server patterns apply`);

// ~/.ssh/config: aliases, host names and users of the blocks that are not
// code hosts. Wildcard patterns and very short values are skipped (too many
// false hits).
const CODE_HOSTS = /github|gitlab|codeberg|bitbucket|sourcehut|sr\.ht/i;
const sshConfig = join(homedir(), ".ssh", "config");
if (existsSync(sshConfig)) {
  let block = null;
  const blocks = [];
  for (const raw of readFileSync(sshConfig, "utf8").split("\n")) {
    const m = raw.trim().match(/^(\w+)\s*=?\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "host" || key === "match") {
      block = { hosts: key === "host" ? m[2].split(/\s+/) : [], values: {} };
      blocks.push(block);
    } else if (block) block.values[key] = m[2].trim();
  }
  for (const b of blocks) {
    const all = [...b.hosts, b.values.hostname ?? ""].join(" ");
    if (CODE_HOSTS.test(all)) continue;
    for (const h of b.hosts)
      if (!/[*?!]/.test(h) && h.length >= 4)
        literals.push({ value: h, what: "SSH host alias (~/.ssh/config)" });
    if (b.values.hostname?.length >= 4)
      literals.push({ value: b.values.hostname, what: "server host name (~/.ssh/config)" });
    if (b.values.user?.length >= 4 && b.values.user !== "root")
      literals.push({ value: b.values.user, what: "server user name (~/.ssh/config)" });
  }
}

// A literal that is part of the public facts (src/data/site.ts: name, GitHub
// handle, domain) is no secret, e.g. a server user named like its owner.
const publicFacts = readFileSync("src/data/site.ts", "utf8").toLowerCase();
for (let i = literals.length - 1; i >= 0; i--) {
  if (literals[i].what.includes("~/.ssh/config") && publicFacts.includes(literals[i].value.toLowerCase())) {
    notes.push(`${literals[i].what} skipped: part of the public facts in src/data/site.ts`);
    literals.splice(i, 1);
  }
}

// Placeholders that docs and the Caddy generator use on purpose.
const PLACEHOLDER_PATHS = [
  "/srv/www/timurmanjosov.com/current",
  "/srv/fixture-site/",
  "/srv/example.invalid",
];
const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`(?<![\\d.])(?:${OCTET}\\.){3}${OCTET}(?![\\d.])`, "g");
const IPV6 = /(?<![\w:])(?:[0-9a-f]{1,4}:){2,7}(?::|[0-9a-f]{1,4})(?![\w:])/gi;
const harmlessIp = (ip) =>
  /^(127\.|0\.0\.0\.0$|255\.|10\.0\.0\.[01]$|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(ip);
const harmlessIp6 = (ip) => {
  const v = ip.toLowerCase();
  // Needs a hex letter or "::" to tell it from times like 15:26:25.
  if (!/[a-f]/.test(v) && !v.includes("::")) return true;
  return v === "::1" || v.startsWith("2001:db8") || v.startsWith("fe80:") || !/\d/.test(v);
};
// A path counts once a real name follows ("/var/www/…" in prose does not).
const SERVER_PATH =
  /(?:\/var\/www\/[\w.-][^\s"'`<>)]*|\/srv\/[\w.-][^\s"'`<>)]*|\/home\/[a-z_][\w-]*\/|\/root\/[\w.-])/g;

const TOKENS = [
  [/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY(?: BLOCK)?-----/, "private key block"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, "GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{22,}\b/, "GitHub fine-grained token"],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/, "GitLab token"],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, "Slack token"],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}\b/, "Anthropic API key"],
  [/\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/, "OpenAI-style API key"],
  [/\b[MN][A-Za-z\d]{23,25}\.[\w-]{6}\.[\w-]{27,}\b/, "Discord bot token"],
  [
    /\b(?:api[_-]?key|secret|token|passw(?:or)?d|client[_-]?secret)\b["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i,
    "secret assignment",
  ],
];

const IGNORED = [
  [/(^|\/)\.directory$/, ".directory"],
  [/^release\//, "release/"],
  [/^private\//, "private/"],
  [/^dist(?:-[^/]*)?\//, "dist*/"],
  [/^\.screenshots\//, ".screenshots/"],
  [/^\.tmp\//, ".tmp/"],
];

// ---- Scan ----

const findings = [];
const add = (commit, where, kind, detail) =>
  findings.push({ commit: commit.slice(0, 8), where, kind, detail });
for (const u of unreadable)
  findings.push({
    commit: "-",
    where: u,
    kind: "private file not readable, its values were not searched",
    detail: "",
  });

function scanText(commit, where, text) {
  const lower = text.toLowerCase();
  for (const l of literals)
    if (lower.includes(l.value.toLowerCase())) add(commit, where, l.what, mask(l.value));
  for (const ip of text.match(IPV4) ?? []) if (!harmlessIp(ip)) add(commit, where, "IPv4 address", mask(ip));
  for (const ip of text.match(IPV6) ?? []) if (!harmlessIp6(ip)) add(commit, where, "IPv6 address", mask(ip));
  for (const p of text.match(SERVER_PATH) ?? [])
    if (!PLACEHOLDER_PATHS.some((ok) => p.startsWith(ok))) add(commit, where, "server path", mask(p));
  for (const [re, what] of TOKENS) {
    const m = text.match(re);
    if (m) add(commit, where, what, mask(m[0]));
  }
}

const commits = git("rev-list", "--reverse", `${base}..${head}`).split("\n").filter(Boolean);
const NOREPLY = /^[\w.+-]+@users\.noreply\.github\.com$/i;

for (const sha of commits) {
  const [an, ae, cn, ce, ...body] = git("show", "-s", "--format=%an%x00%ae%x00%cn%x00%ce%x00%B", sha).split(
    "\0",
  );
  if (!NOREPLY.test(ae)) add(sha, "author", "e-mail is not a GitHub noreply address", `${mask(ae)} (${an})`);
  if (!NOREPLY.test(ce))
    add(sha, "committer", "e-mail is not a GitHub noreply address", `${mask(ce)} (${cn})`);
  body
    .join("\0")
    .split("\n")
    .forEach((line, i) => {
      scanText(sha, `commit message, line ${i + 1}`, line);
    });

  for (const path of git(
    "diff-tree",
    "--no-commit-id",
    "-r",
    "--root",
    "--name-only",
    "--diff-filter=ACMR",
    "-z",
    sha,
  )
    .split("\0")
    .filter(Boolean)) {
    for (const [re, what] of IGNORED) if (re.test(path)) add(sha, path, "file belongs in .gitignore", what);
  }

  // Added lines with their line numbers in the new file.
  const diff = git(
    "-c",
    "core.quotepath=off",
    "show",
    "--format=",
    "--no-color",
    "--no-ext-diff",
    "--unified=0",
    "--root",
    sha,
  );
  let file = "";
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.slice(4).replace(/^b\//, "");
    } else if (raw.startsWith("@@")) {
      line = Number(raw.match(/\+(\d+)/)?.[1] ?? 0);
    } else if (raw.startsWith("+")) {
      // SVG path data is all numbers and dots: no addresses in there.
      if (!/\sd="[^"]*$|^\+\s*d="/.test(raw)) scanText(sha, `${file}:${line}`, raw.slice(1));
      line++;
    }
  }
}

// ---- Report ----

console.log(`pre-push check: ${commits.length} commit(s) in ${base}..${head}`);
console.log(
  `  searched for ${literals.length} private/server literal(s), IP addresses, server paths, ${TOKENS.length} token patterns, commit e-mails and ignored files`,
);
for (const n of notes) console.log(`  note: ${n}`);
// exitCode instead of exit(): the start script reads the code, and exit()
// right after a long report can cut off output written to a pipe.
if (!findings.length) {
  console.log("\nGO: nothing in these commits that must not reach GitHub.");
  process.exitCode = 0;
} else report();

function report() {
  const byWhat = new Map();
  for (const f of findings) {
    byWhat.set(f.kind, (byWhat.get(f.kind) ?? 0) + 1);
  }
  console.log(`\nNO-GO: ${findings.length} finding(s)`);
  const shown = findings.slice(0, 200);
  for (const f of shown) console.log(`  ${f.commit}  ${f.where}  ${f.kind}: ${f.detail}`);
  if (findings.length > shown.length) console.log(`  … and ${findings.length - shown.length} more`);
  console.log("\nSummary:");
  for (const [what, n] of byWhat) console.log(`  ${String(n).padStart(4)} × ${what}`);
  console.log('\nFix: squash the branch with the noreply address (docs/GO-LIVE.md, "Before the push").');
  process.exitCode = 1;
}
