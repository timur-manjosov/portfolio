/**
 * Content schemas. Every Markdown file is validated at build time; a missing
 * date, an unknown category or a typo in a field name fails `astro build`.
 *
 * Layout on disk: src/content/<collection>/<lang>/<slug>.md
 * The language is the first path segment of the entry id (checked in
 * src/lib/content.ts, which throws on anything other than de/ or en/).
 * Files with the same slug in de/ and en/ are translations of each other;
 * `translationKey` overrides that when slugs differ.
 */
import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { blogSchema, pageSchema, projectSchema } from "./lib/content-schemas";

/**
 * Test fixtures (tests/fixtures/blog/<lang>/<slug>.md): example posts that
 * exercise maths, code, footnotes, series, drafts and scheduling. They are
 * loaded only when CONTENT_FIXTURES=1, which tools/build.mjs sets for
 * `--fixtures` (test builds) and refuses in release mode. The production and
 * release builds never see them (tools/check-fixtures.mjs).
 */
const WITH_FIXTURES = process.env.CONTENT_FIXTURES === "1";
const BLOG_DIRS = ["src/content/blog", ...(WITH_FIXTURES ? ["tests/fixtures/blog"] : [])];

const blog = defineCollection({
  loader: glob({
    pattern: BLOG_DIRS.map((d) => `${d}/**/*.md`),
    base: ".",
    // Same ids as with base "src/content/blog": "<lang>/<slug>".
    generateId: ({ entry }) => {
      const dir = BLOG_DIRS.find((d) => entry.startsWith(`${d}/`));
      if (!dir) throw new Error(`blog entry outside the content folders: ${entry}`);
      return entry.slice(dir.length + 1).replace(/\.md$/, "");
    },
  }),
  schema: blogSchema(reference("categories")),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

/** Standalone pages (about, now, uses, contact, privacy, imprint). */
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: pageSchema,
});

const localized = z.object({ de: z.string().min(1), en: z.string().min(1) }).strict();

/** Blog taxonomy. New category = new entry in categories.yaml, no code change. */
const categories = defineCollection({
  loader: file("./src/content/categories.yaml"),
  schema: z
    .object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      label: localized,
      description: localized,
      // Posts in an opinion category get a visible "opinion" label + date note.
      opinion: z.boolean().default(false),
      order: z.number().int().default(100),
    })
    .strict(),
});

export const collections = { blog, projects, pages, categories };
