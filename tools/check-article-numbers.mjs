// The numbers of the Bitcoin post, in both languages, against
// tests/articles/bitcoin_security_budget.py (brief R6 §2.6):
//
//   node tools/check-article-numbers.mjs
//
// 1. The script passes on the real texts.
// 2. It fails on copies with one number changed per language (so a typo in
//    either text cannot slip through): each mutation must be reported.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reporter } from "./lib.mjs";

const r = reporter("article numbers (Bitcoin post, DE + EN)");
const SCRIPT = "tests/articles/bitcoin_security_budget.py";
const DE = "src/content/blog/de/bitcoin-was-in-den-naechsten-jahrzehnten-entschieden-wird.md";
const EN = "src/content/blog/en/bitcoin-what-gets-decided-in-the-coming-decades.md";
const OUT = ".cache/article-numbers";
mkdirSync(OUT, { recursive: true });

const run = (args = []) => spawnSync("python3", ["-B", SCRIPT, ...args], { encoding: "utf8" });

const real = run();
if (real.status !== 0) r.fail(SCRIPT, (real.stderr || real.stdout).trim());
const summary = real.stdout.trim().match(/(\d+) checks/)?.[1] ?? "?";

// [file, from, to, the failure message must mention]
const mutations = [
  [DE, "= 450 BTC täglich", "= 460 BTC täglich", "[de]"],
  [DE, "|          56 |", "|          57 |", "[de]"],
  [DE, "−84 %", "−86 %", "[de]"],
  [EN, "= 450 BTC daily", "= 460 BTC daily", "[en]"],
  [EN, "around 1.18 million dollars", "around 1.28 million dollars", "[en]"],
  [EN, "in one case out of sixteen", "in one case out of twelve", "[en]"],
];
let caught = 0;
for (const [i, [file, from, to, mark]] of mutations.entries()) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(from)) {
    r.fail(file, `mutation ${i + 1}: anchor ${JSON.stringify(from)} not found`);
    continue;
  }
  const copy = join(OUT, `m${i + 1}.md`);
  writeFileSync(copy, text.replace(from, to));
  const res = run([file === DE ? "--de" : "--en", copy]);
  if (res.status === 0 || !res.stderr.includes(mark)) {
    r.fail(copy, `mutation ${i + 1} (${from} → ${to}) not reported`);
  } else caught++;
}

r.done(`${summary} checks pass on both texts; ${caught}/${mutations.length} changed numbers caught`);
