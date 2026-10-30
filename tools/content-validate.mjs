// Validates a content file with the same schemas Astro uses
// (src/lib/content-schemas.ts), for tools that write content and their tests.
//
//   import { validateContent } from "./content-validate.mjs";
//   validateContent("src/content/blog/de/x.md")  → [] or a list of problems
import { readFileSync } from "node:fs";
import { z } from "astro/zod";
import { parse as parseYaml } from "yaml";
import { blogSchema, pageSchema, projectSchema } from "../src/lib/content-schemas.ts";

/** Category ids from categories.yaml (relative to the working directory). */
export function categoryIds(file = "src/content/categories.yaml") {
  return (parseYaml(readFileSync(file, "utf8")) ?? []).map((c) => c.id);
}

/** Splits "---\n<yaml>\n---\n<body>"; throws without frontmatter. */
export function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  return { yaml: m[1], body: m[2] };
}

/** Problems with the file at `path` (collection from the path), empty if valid. */
export function validateContent(path, { categories = categoryIds() } = {}) {
  const collection = path.match(/(?:^|\/)(blog|projects|pages)\/(de|en)\/[^/]+\.md$/)?.[1];
  if (!collection) return [`${path}: not below blog|projects|pages/<de|en>/`];
  let data;
  try {
    data = parseYaml(splitFrontmatter(readFileSync(path, "utf8")).yaml) ?? {};
  } catch (e) {
    return [`${path}: ${e.message}`];
  }
  const schema =
    collection === "blog"
      ? blogSchema(z.string().refine((c) => categories.includes(c), "unknown category"))
      : collection === "projects"
        ? projectSchema
        : pageSchema;
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => `${path}: ${i.path.join(".")}: ${i.message}`);
}
