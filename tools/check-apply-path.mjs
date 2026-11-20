// deploy/apply-on-server.sh sets its own PATH (brief R6 §2.8 a): over SSH a
// normal user's PATH often lacks /usr/sbin, and the dry run then reported
// "missing tool: runuser". This test runs the dry run with a stub PATH that
// contains no system directory at all (no sbin, no bin) and checks that
//   - the script still finds its basic commands (dirname, basename, date),
//   - every tool it requires that exists in one of the fixed directories is
//     found (in particular runuser, the one that was missing),
//   - the PATH line comes before the first command the script runs.
// Read-only: the dry run changes nothing; the stage is a scratch directory.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reporter } from "./lib.mjs";

const r = reporter("apply-on-server.sh PATH");
const SCRIPT = "deploy/apply-on-server.sh";
const FIXED = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const source = readFileSync(SCRIPT, "utf8");

// 1. Static: the export comes right after `set`/`umask`, before arguments.
const lines = source.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
const exportAt = lines.findIndex((l) => l.trim() === `export PATH=${FIXED}`);
if (exportAt < 0) r.fail(SCRIPT, `no line "export PATH=${FIXED}"`);
else if (lines.slice(0, exportAt).some((l) => !/^(#!|set -euo pipefail|umask 022)/.test(l.trim())))
  r.fail(SCRIPT, "a command runs before the PATH is set");

// 2. Dynamic: a dry run with a PATH that has no system directory.
const tmp = join(".cache", "apply-path");
rmSync(tmp, { recursive: true, force: true });
const stub = join(tmp, "stub-bin");
const stage = join(tmp, "20261114T000000Z-0000000");
mkdirSync(stub, { recursive: true });
mkdirSync(stage, { recursive: true });
const bash = execFileSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).trim();
const dryRun = (script) => {
  const run = spawnSync(bash, [script, "--dry-run", "--stage-dir", stage], {
    encoding: "utf8",
    env: { PATH: stub, LANG: "C" },
    timeout: 60_000,
  });
  return `${run.stdout}\n${run.stderr}`;
};
const output = dryRun(SCRIPT);

// Control: the same script without the PATH line must break with this stub,
// otherwise the stub proves nothing.
const withoutFix = join(tmp, "apply-without-path.sh");
writeFileSync(withoutFix, source.replace(/^export PATH=.*\n/m, ""));
if (!/command not found|Kommando nicht gefunden/i.test(dryRun(withoutFix)))
  r.fail(SCRIPT, "control failed: without the PATH line the stub run should not find its commands");
if (/command not found|Kommando nicht gefunden/i.test(output))
  r.fail(SCRIPT, `a command was not found with a stub PATH:\n${output.split("\n").slice(0, 8).join("\n")}`);
if (!output.includes("==> release 20261114T000000Z-0000000"))
  r.fail(SCRIPT, "the dry run did not get past its first step");

const required =
  source
    .match(/for tool in ([^;]+); do/)?.[1]
    .trim()
    .split(/\s+/) ?? [];
if (!required.includes("runuser")) r.fail(SCRIPT, "the tool list no longer names runuser");
let found = 0;
for (const tool of required) {
  const inFixed = FIXED.split(":").some((dir) => existsSync(join(dir, tool)));
  const reported = output.includes(`missing tool: ${tool}`);
  if (inFixed && reported) r.fail(SCRIPT, `${tool} exists in the fixed PATH but was reported missing`);
  if (!inFixed && !reported) r.fail(SCRIPT, `${tool} is not installed here but was not reported missing`);
  if (inFixed) found++;
}
rmSync(tmp, { recursive: true, force: true });
r.done(
  `PATH fixed before the first command; dry run with a stub PATH (no sbin, no bin): ${found}/${required.length} required tools found where installed, none falsely missing; control without the PATH line fails`,
);
