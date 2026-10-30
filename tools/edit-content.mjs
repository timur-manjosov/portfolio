// Open the right content file in your editor (docs/PUBLISHING.md).
//
//   npm run edit:now                       /now, German (--lang en for English)
//   npm run edit -- about [--lang en]      any page: about, now, uses, contact, privacy, …
//   npm run edit -- post <slug> [--lang en]
//   npm run edit -- project <slug> [--lang en]
//
// The editor is $VISUAL, else $EDITOR, else nano, else vi. When the editor
// closes:
// - a page or project whose file changed gets `updated: <today>` (Berlin day),
//   the date /now and the project pages show; an unchanged file keeps it
// - posts keep their dates (`date` is the publication day; set `updated`
//   yourself if a published post changes in substance)
// - the frontmatter is validated with the schemas Astro uses; problems are
//   printed and the exit code is 1 (the file stays as you saved it)
// Nothing else is changed, nothing is committed or published.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { berlinDay } from "../src/lib/schedule.ts";
import { validateContent } from "./content-validate.mjs";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

let positionals;
let values;
try {
  ({ positionals, values } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" } } }));
} catch (e) {
  fail(e.message);
}
const [what, slug] = positionals;
if (values.lang && !["de", "en"].includes(values.lang)) fail(`--lang must be de or en, not "${values.lang}"`);

/** The file for a slug in a collection; without --lang German first, then English. */
function find(collection, name) {
  const langs = values.lang ? [values.lang] : ["de", "en"];
  for (const lang of langs) {
    const file = join("src/content", collection, lang, `${name}.md`);
    if (existsSync(file)) return file;
  }
  const known = readdirSync(join("src/content", collection, langs[0]))
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.slice(0, -3));
  fail(`no ${collection} "${name}" in ${langs.join("/")}. Known: ${known.join(", ")}`);
}

let file;
let collection;
if (what === "post" || what === "project") {
  if (!slug) fail(`usage: npm run edit -- ${what} <slug> [--lang de|en]`);
  collection = what === "post" ? "blog" : "projects";
  file = find(collection, slug);
} else if (what) {
  collection = "pages";
  file = find("pages", what);
} else {
  fail("usage: npm run edit -- <page | post <slug> | project <slug>> [--lang de|en]   (or npm run edit:now)");
}

function editorCommand() {
  const configured = (process.env.VISUAL || process.env.EDITOR || "").trim();
  if (configured) return configured.split(/\s+/);
  for (const candidate of ["nano", "vi"]) {
    if (spawnSync("sh", ["-c", 'command -v "$0"', candidate]).status === 0) return [candidate];
  }
  fail(`no editor found; set EDITOR, or open ${file} yourself`);
}

const before = readFileSync(file, "utf8");
const [cmd, ...args] = editorCommand();
console.log(`editing ${file}`);
const ed = spawnSync(cmd, [...args, file], { stdio: "inherit" });
if (ed.error) fail(`could not start the editor "${cmd}": ${ed.error.message}`);
if (ed.status !== 0) fail(`the editor exited with ${ed.status}; ${file} left as it is`);

let after = readFileSync(file, "utf8");
if (after === before) {
  console.log("no changes.");
} else if (collection !== "blog") {
  const today = berlinDay(new Date());
  const fm = after.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const yaml = /^updated:.*$/m.test(fm[1])
      ? fm[1].replace(/^updated:.*$/m, `updated: ${today}`)
      : `${fm[1]}\nupdated: ${today}`;
    after = `---\n${yaml}\n---${after.slice(fm[0].length)}`;
    writeFileSync(file, after);
    console.log(`saved; updated: ${today}`);
  }
} else {
  console.log("saved.");
}

const problems = validateContent(file);
if (problems.length) {
  console.error("The frontmatter does not pass the schema (the build would fail):");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
