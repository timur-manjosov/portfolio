// Scaffold a new blog post or project (docs/PUBLISHING.md).
//
//   npm run new:post -- --title "Mein Beitrag" [--lang de|en|both] [--category tech] [--slug …]
//   npm run new:project -- --title "Mein Projekt" [--lang de|en|both] [--slug …]
//   npm run new                                  interactive (asks type, language, title …)
//
// Defaults without a terminal to ask on: --lang de, --category tech (the
// first category). The date is today in Europe/Berlin, the same day the
// scheduled-post logic uses (src/lib/schedule.ts). `--lang both` creates
// DE and EN with a shared translationKey.
//
// New files start as `draft: true`: visible in `npm run dev` and
// `npm run build:drafts`, never in production until the flag is false.
// The script writes only the new files; it opens nothing and changes nothing
// else. It refuses (and writes nothing) if a file with that slug exists in
// either language (the same slug in de/ and en/ pairs two files as
// translations) or the slug is used as a translationKey.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { berlinDay } from "../src/lib/schedule.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    lang: { type: "string" },
    title: { type: "string" },
    category: { type: "string" },
    slug: { type: "string" },
  },
});

const categories = [
  ...readFileSync("src/content/categories.yaml", "utf8").matchAll(/^- id: ([a-z0-9-]+)/gm),
].map((m) => m[1]);
const today = berlinDay(new Date());

const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
/** The flag if given; else ask on a terminal; else the default (or fail). */
async function ask(question, given, allowed, fallback) {
  if (given) return given;
  if (!rl) {
    if (fallback) return fallback;
    throw new Error(`Missing value for "${question}" (no terminal to ask on). Pass it as a flag.`);
  }
  for (;;) {
    const hint = allowed ? ` [${allowed.join("/")}]` : "";
    const answer = (await rl.question(`${question}${hint}: `)).trim();
    if (answer && (!allowed || allowed.includes(answer))) return answer;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const yamlString = (s) => JSON.stringify(s);

try {
  const type = await ask("Type", positionals[0], ["post", "project"]);
  if (!["post", "project"].includes(type)) throw new Error(`Unknown type "${type}" (post or project).`);
  const langChoice = await ask("Language", values.lang, ["de", "en", "both"], "de");
  if (!["de", "en", "both"].includes(langChoice))
    throw new Error(`Unknown language "${langChoice}" (de, en, both).`);
  const title = (await ask("Title", values.title)).trim();
  if (!title) throw new Error("The title is empty.");
  const slug = values.slug ?? slugify(title);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    throw new Error(`Could not derive a usable slug from the title ("${slug}"); pass --slug.`);
  const category =
    type === "post" ? await ask("Category", values.category, categories, categories[0]) : undefined;
  if (category && !categories.includes(category))
    throw new Error(
      `Unknown category "${category}". Known: ${categories.join(", ")} (src/content/categories.yaml)`,
    );
  rl?.close();

  // Collisions, checked for every language before anything is written.
  const dir = type === "post" ? "blog" : "projects";
  const roots = [join("src/content", dir), ...(type === "post" ? ["tests/fixtures/blog"] : [])];
  for (const root of roots) {
    for (const lang of ["de", "en"]) {
      const file = join(root, lang, `${slug}.md`);
      if (existsSync(file))
        throw new Error(
          `${file} already exists (same slug = translation pair); nothing written. Pass another --slug.`,
        );
      if (!existsSync(join(root, lang))) continue;
      for (const name of readdirSync(join(root, lang)).filter((n) => n.endsWith(".md"))) {
        const key = readFileSync(join(root, lang, name), "utf8").match(
          /^translationKey:\s*["']?([^"'\n]+)/m,
        )?.[1];
        if (key?.trim() === slug)
          throw new Error(
            `${join(root, lang, name)} uses translationKey "${slug}"; nothing written. Pass another --slug.`,
          );
      }
    }
  }

  const langs = langChoice === "both" ? ["de", "en"] : [langChoice];
  const created = [];
  for (const lang of langs) {
    const todo =
      lang === "de" ? "TODO: Beschreibung (20–160 Zeichen)" : "TODO: description (20–160 characters)";
    const lines =
      type === "post"
        ? [
            `title: ${yamlString(title)}`,
            `description: ${yamlString(todo)}`,
            `date: ${today}`,
            `category: ${category}`,
            "tags: []",
            "draft: true",
          ]
        : [
            `title: ${yamlString(title)}`,
            `summary: ${yamlString(todo)}`,
            "stage: in-development # active | in-development | maintained | paused | archived",
            "tags: []",
            "stack: []",
            "links: {} # repo / website / release",
            "# repo: owner/name  # public GitHub repository: last push, stars and languages at release time",
            `started: ${today}`,
            `updated: ${today}`,
            "draft: true",
          ];
    if (langs.length > 1) lines.push(`translationKey: ${slug}`);
    const body =
      type === "post"
        ? lang === "de"
          ? "Einleitung.\n\n## Abschnitt\n\nText. Formeln mit $a^2 + b^2 = c^2$ oder als Block:\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
          : "Introduction.\n\n## Section\n\nText. Maths inline with $a^2 + b^2 = c^2$ or as a block:\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
        : lang === "de"
          ? "## Worum es geht\n\nWelches Problem löst das Projekt?\n\n## Stand\n\nWas funktioniert, was fehlt.\n"
          : "## What it is about\n\nWhich problem does the project solve?\n\n## Status\n\nWhat works, what is missing.\n";
    const file = join("src/content", dir, lang, `${slug}.md`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `---\n${lines.join("\n")}\n---\n\n${body}`, { flag: "wx" });
    created.push(file);
  }

  console.log(`Created (draft: true, date ${today}):\n${created.map((f) => `  ${f}`).join("\n")}`);
  if (type === "post" && !values.category)
    console.log(`Category: ${category} (change it in the frontmatter).`);
  console.log(
    "Preview with `npm run dev`. Set `draft: false`, commit, then `npm run publish` (docs/PUBLISHING.md).",
  );
} catch (e) {
  rl?.close();
  console.error(`error: ${e.message}`);
  process.exitCode = 1;
}
