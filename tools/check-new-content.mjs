// Tests of `npm run new:post` / `new:project` (tools/new-content.mjs) and
// `npm run edit` (tools/edit-content.mjs), run in a scratch copy of the
// content folders so the real content is never touched.
//
//   node tools/check-new-content.mjs
//
// new:post / new:project: valid frontmatter (validated with the schemas
// Astro uses, src/lib/content-schemas.ts), draft: true, today's Berlin date,
// slug from the title (umlauts), --lang both pairs with a translationKey,
// collisions in either language or with a translationKey refuse and write
// nothing, unknown category refuses.
// edit: opens $EDITOR on the right file; a page or project that was changed
// gets today's `updated`, an unchanged one keeps its date; a post keeps its
// dates; unknown targets refuse.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { berlinDay } from "../src/lib/schedule.ts";
import { validateContent } from "./content-validate.mjs";
import { reporter } from "./lib.mjs";

const r = reporter("new:post / new:project / edit");
let cases = 0;
const expect = (cond, where, msg) => {
  cases++;
  if (!cond) r.fail(where, msg);
};
const ROOT = resolve(import.meta.dirname, "..");
const today = berlinDay(new Date());
const tmp = mkdtempSync(join(tmpdir(), "check-new-content-"));
for (const d of ["src/content", "tests/fixtures/blog"])
  cpSync(join(ROOT, d), join(tmp, d), { recursive: true });

const run = (script, args, env = {}) =>
  spawnSync("node", [join(ROOT, "tools", script), ...args], {
    cwd: tmp,
    encoding: "utf8",
    // No terminal: the scripts must use their defaults or fail, never wait.
    input: "",
    env: { ...process.env, ...env },
  });
const read = (f) => readFileSync(join(tmp, f), "utf8");
const valid = (f) => {
  const problems = validateContent(join(tmp, f), { categories: categoryIds() });
  expect(problems.length === 0, f, problems.join("; "));
};
const categoryIds = () =>
  [...read("src/content/categories.yaml").matchAll(/^- id: ([a-z0-9-]+)/gm)].map((m) => m[1]);
const listing = () =>
  ["blog", "projects", "pages"].flatMap((c) =>
    ["de", "en"].flatMap((l) => readdirSync(join(tmp, "src/content", c, l)).map((n) => `${c}/${l}/${n}`)),
  );

try {
  // new:post, defaults
  let p = run("new-content.mjs", ["post", "--title", "Größe & Ärger: ein Test"]);
  const post = "src/content/blog/de/groesse-aerger-ein-test.md";
  expect(p.status === 0 && existsSync(join(tmp, post)), "new:post", `${p.status} ${p.stderr}`);
  if (existsSync(join(tmp, post))) {
    valid(post);
    expect(read(post).includes(`date: ${today}\n`), "new:post", "date is not today (Berlin)");
    expect(read(post).includes("draft: true\n"), "new:post", "not a draft");
    expect(read(post).includes("category: tech\n"), "new:post", "default category");
  }
  // the same title again, and the same slug in the other language: refused
  let before = listing().join();
  p = run("new-content.mjs", ["post", "--title", "Größe & Ärger: ein Test"]);
  expect(p.status === 1 && listing().join() === before, "collision same language", p.stderr);
  p = run("new-content.mjs", ["post", "--title", "Größe & Ärger: ein Test", "--lang", "en"]);
  expect(p.status === 1 && listing().join() === before, "collision other language", p.stderr);
  p = run("new-content.mjs", ["post", "--title", "Paar", "--lang", "both", "--category", "notes"]);
  expect(p.status === 0, "both", p.stderr);
  for (const l of ["de", "en"]) {
    const f = `src/content/blog/${l}/paar.md`;
    expect(
      existsSync(join(tmp, f)) && read(f).includes("translationKey: paar\n"),
      "both",
      `${f} missing or unpaired`,
    );
    if (existsSync(join(tmp, f))) valid(f);
  }
  // translationKey used by an existing post (the EC launch post pair)
  before = listing().join();
  p = run("new-content.mjs", ["post", "--title", "ecc group law", "--lang", "de"]);
  expect(
    p.status === 1 && /translationKey/.test(p.stderr) && listing().join() === before,
    "translationKey",
    p.stderr,
  );
  p = run("new-content.mjs", ["post", "--title", "x y", "--category", "nope"]);
  expect(p.status === 1 && listing().join() === before, "unknown category", p.stderr);
  p = run("new-content.mjs", ["post", "--title", "!!!"]);
  expect(p.status === 1 && listing().join() === before, "no usable slug", p.stderr);

  // new:project
  p = run("new-content.mjs", ["project", "--title", "Werkzeug", "--lang", "both"]);
  expect(p.status === 0, "new:project", p.stderr);
  for (const l of ["de", "en"]) {
    const f = `src/content/projects/${l}/werkzeug.md`;
    if (existsSync(join(tmp, f))) {
      valid(f);
      expect(read(f).includes(`updated: ${today}\n`), "new:project", "updated is not today");
    } else expect(false, "new:project", `${f} missing`);
  }

  // edit: a fake editor that appends a line (EDITOR="node <script>")
  const fake = join(tmp, "fake-editor.mjs");
  writeFileSync(
    fake,
    'import { appendFileSync } from "node:fs";\nappendFileSync(process.argv[2], "\\nEdited.\\n");\n',
  );
  const noop = join(tmp, "noop-editor.mjs");
  writeFileSync(noop, "");
  const editor = { EDITOR: `node ${fake}`, VISUAL: "" };
  const now = "src/content/pages/de/now.md";
  const oldNow = read(now);
  const oldUpdated = oldNow.match(/^updated: (.+)$/m)?.[1];
  p = run("edit-content.mjs", ["now", "--lang", "de"], { EDITOR: `node ${noop}`, VISUAL: "" });
  expect(p.status === 0 && read(now) === oldNow, "edit unchanged", `${p.status} ${p.stderr}`);
  p = run("edit-content.mjs", ["now"], editor);
  expect(p.status === 0, "edit:now", p.stderr);
  expect(
    read(now).includes("Edited.") && read(now).includes(`updated: ${today}\n`),
    "edit:now",
    "updated not set",
  );
  expect(
    oldUpdated === today || !read(now).includes(`updated: ${oldUpdated}\n`),
    "edit:now",
    "old date kept",
  );
  valid(now);
  p = run("edit-content.mjs", ["about", "--lang", "en"], editor);
  expect(
    p.status === 0 && read("src/content/pages/en/about.md").includes(`updated: ${today}\n`),
    "edit about",
    p.stderr,
  );
  const launch = "src/content/blog/de/elliptische-kurven-gruppengesetz.md";
  const launchBefore = read(launch);
  p = run("edit-content.mjs", ["post", "elliptische-kurven-gruppengesetz"], editor);
  const launchAfter = read(launch);
  expect(
    p.status === 0 &&
      launchAfter.includes("Edited.") &&
      launchAfter.split("---")[1] === launchBefore.split("---")[1],
    "edit post",
    "frontmatter of a post changed",
  );
  p = run("edit-content.mjs", ["project", "werkzeug", "--lang", "en"], editor);
  expect(
    p.status === 0 && read("src/content/projects/en/werkzeug.md").includes("Edited."),
    "edit project",
    p.stderr,
  );
  for (const args of [["nothing"], ["post", "does-not-exist"], ["post"], ["now", "--lang", "fr"]]) {
    p = run("edit-content.mjs", args, editor);
    expect(p.status === 1, `edit ${args.join(" ")}`, `exit ${p.status}`);
  }
  // A broken field name is reported (exit 1), the file stays as saved.
  const breaker = join(tmp, "break-editor.mjs");
  writeFileSync(
    breaker,
    'import { readFileSync, writeFileSync } from "node:fs";\nconst f = process.argv[2];\nwriteFileSync(f, readFileSync(f, "utf8").replace("title:", "titel:"));\n',
  );
  p = run("edit-content.mjs", ["uses"], { EDITOR: `node ${breaker}`, VISUAL: "" });
  expect(p.status === 1 && /titel|title/.test(p.stderr), "invalid frontmatter", `exit ${p.status}`);

  // Round trip: opening and closing every real content file (the four launch
  // posts included) without a change leaves it byte for byte as it was.
  let roundTrips = 0;
  for (const c of ["blog", "projects", "pages"]) {
    for (const l of ["de", "en"]) {
      for (const n of readdirSync(join(ROOT, "src/content", c, l)).filter((x) => x.endsWith(".md"))) {
        const f = `src/content/${c}/${l}/${n}`;
        cpSync(join(ROOT, f), join(tmp, f));
        const kind =
          c === "blog"
            ? ["post", n.slice(0, -3)]
            : c === "projects"
              ? ["project", n.slice(0, -3)]
              : [n.slice(0, -3)];
        p = run("edit-content.mjs", [...kind, "--lang", l], { EDITOR: `node ${noop}`, VISUAL: "" });
        expect(
          p.status === 0 && read(f) === readFileSync(join(ROOT, f), "utf8"),
          `round trip ${f}`,
          p.stderr,
        );
        roundTrips++;
      }
    }
  }
  expect(roundTrips >= 20, "round trip", `only ${roundTrips} files`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

r.done(
  `${cases} cases: frontmatter valid against the Astro schemas, Berlin date, slugs, pairs, collisions, edit + updated`,
);
