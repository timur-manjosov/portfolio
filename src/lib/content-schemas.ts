/**
 * Frontmatter schemas of the content collections, in one place for two users:
 * src/content.config.ts (Astro validates every file at build time) and the
 * Node tools that write content (tools/new-content.mjs, tools/edit-content.mjs
 * and their tests, which validate what they write with the same schemas).
 *
 * Plain TypeScript importing only `astro/zod`, so Node can load it directly.
 * The category field is passed in: Astro uses `reference("categories")`,
 * the tools a check against src/content/categories.yaml.
 */
import { z } from "astro/zod";

/** Editorial state of a text: written by the agent and awaiting Timur's review, or approved. */
const editorialStatus = z.enum(["draft-review", "ready"]).default("ready");

/** GitHub repository as owner/name (public facts are fetched at release time, src/lib/github-meta.ts). */
export const repoSlug = z
  .string()
  .regex(/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/, "repo must look like owner/name");

// biome-ignore lint/suspicious/noExplicitAny: Astro's reference() and a plain zod string both fit here.
export function blogSchema(category: z.ZodType<any>) {
  return z
    .object({
      title: z.string().min(1).max(120),
      description: z.string().min(20).max(300),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      // Must match an id in categories.yaml (build fails otherwise).
      category,
      tags: z.array(z.string().min(1)).default([]),
      series: z.string().min(1).optional(),
      seriesPart: z.number().int().positive().optional(),
      draft: z.boolean().default(false),
      // Marks example/demo posts so they are never mistaken for real ones.
      example: z.boolean().default(false),
      translationKey: z.string().min(1).optional(),
      // Table of contents: `true`/`false` forces it, default is automatic
      // (shown when the post has at least three h2/h3 headings).
      toc: z.boolean().optional(),
      status: editorialStatus,
    })
    .strict()
    .refine((d) => !d.updated || d.updated >= d.date, {
      message: "`updated` must not be earlier than `date`",
      path: ["updated"],
    })
    .refine((d) => (d.seriesPart === undefined) === (d.series === undefined), {
      message: "`series` and `seriesPart` must be set together",
      path: ["seriesPart"],
    });
}

export const projectSchema = z
  .object({
    title: z.string().min(1).max(80),
    summary: z.string().min(10).max(200),
    stage: z.enum(["active", "in-development", "maintained", "paused", "archived"]),
    tags: z.array(z.string().min(1)).default([]),
    stack: z.array(z.string().min(1)).default([]),
    links: z
      .object({
        repo: z.url().optional(),
        website: z.url().optional(),
        release: z.url().optional(),
      })
      .strict()
      .default({}),
    // Public GitHub repository (owner/name). With GITHUB_META=1 (the release
    // build of `npm run publish`) its last push is fetched; values written
    // here by hand win (src/lib/github-meta.ts).
    repo: repoSlug.optional(),
    started: z.coerce.date().optional(),
    updated: z.coerce.date(),
    featured: z.boolean().default(false),
    // Lower numbers first in lists with equal featured state.
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    translationKey: z.string().min(1).optional(),
    status: editorialStatus,
  })
  .strict();

/** Standalone pages (about, now, uses, contact, privacy, imprint). */
export const pageSchema = z
  .object({
    title: z.string().min(1).max(80),
    description: z.string().min(20).max(300),
    updated: z.coerce.date(),
    // Short excerpt, used by the home page for /now.
    summary: z.string().optional(),
    translationKey: z.string().min(1).optional(),
    status: editorialStatus,
    draft: z.boolean().default(false),
    noindex: z.boolean().default(false),
  })
  .strict();
