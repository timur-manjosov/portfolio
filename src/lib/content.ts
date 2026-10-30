import { type CollectionEntry, getCollection } from "astro:content";
import type { Lang } from "../i18n/ui";
import { isLang } from "../i18n/utils";
import { githubMeta, withGithubFacts } from "./github-meta";
import { isScheduled, resolveBuildDay } from "./schedule";

/**
 * Drafts (`draft: true`) are visible in `astro dev` and in
 * `npm run build:drafts` (SHOW_DRAFTS=1), never in the production build.
 * The same goes for scheduled posts (date after the build day, R5 §2.3).
 */
export const SHOW_DRAFTS = import.meta.env.DEV || process.env.SHOW_DRAFTS === "1";

/** Calendar day of this build in Europe/Berlin (BUILD_DATE overrides it in tests). */
export const BUILD_DAY = resolveBuildDay();

type Localized = "blog" | "projects" | "pages";

export interface Parsed<C extends Localized> {
  entry: CollectionEntry<C>;
  lang: Lang;
  slug: string;
  key: string;
  /** Blog only: dated after the build day. Such entries exist only when SHOW_DRAFTS is on. */
  scheduled: boolean;
}

/** Splits "de/some-post" into lang + slug; throws on a wrong folder so the build fails. */
export function parseId<C extends Localized>(entry: CollectionEntry<C>): Parsed<C> {
  const [lang, ...rest] = entry.id.split("/");
  if (!isLang(lang) || rest.length === 0) {
    throw new Error(
      `Content file "${entry.collection}/${entry.id}" must live in a de/ or en/ folder (src/content/${entry.collection}/<lang>/<slug>.md).`,
    );
  }
  const slug = rest.join("/");
  const scheduled =
    entry.collection === "blog" && isScheduled((entry.data as { date: Date }).date, BUILD_DAY);
  return { entry, lang, slug, key: entry.data.translationKey ?? slug, scheduled };
}

/** Not public in a production build: a draft or a scheduled post (shown only in dev/test builds). */
export function isHidden<C extends Localized>(p: Parsed<C>): boolean {
  return p.entry.data.draft || p.scheduled;
}

async function load<C extends Localized>(collection: C): Promise<Parsed<C>[]> {
  // getCollection's generic typing does not narrow per call site here, so the
  // filter result is re-typed to the requested collection.
  const all = (await getCollection(collection)) as CollectionEntry<C>[];
  return all.map((e) => parseId(e)).filter((p) => SHOW_DRAFTS || !isHidden(p));
}

export async function allPosts(): Promise<Parsed<"blog">[]> {
  const posts = await load("blog");
  return posts.sort((a, b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf());
}

export async function allProjects(): Promise<Parsed<"projects">[]> {
  const loaded = await load("projects");
  // `repo: owner/name`: stack and source link from GitHub where the
  // frontmatter leaves them empty (GITHUB_META=1 only, src/lib/github-meta.ts).
  const items = await Promise.all(
    loaded.map(async (p) =>
      p.entry.data.repo
        ? {
            ...p,
            entry: { ...p.entry, data: withGithubFacts(p.entry.data, await githubMeta(p.entry.data.repo)) },
          }
        : p,
    ),
  );
  return items.sort(
    (a, b) =>
      Number(b.entry.data.featured) - Number(a.entry.data.featured) ||
      a.entry.data.order - b.entry.data.order ||
      b.entry.data.updated.valueOf() - a.entry.data.updated.valueOf(),
  );
}

export async function allPages(): Promise<Parsed<"pages">[]> {
  return load("pages");
}

/** Find the counterpart of an item in the other language (same translation key). */
export function findTranslation<C extends Localized>(
  items: Parsed<C>[],
  item: Parsed<C>,
  lang: Lang,
): Parsed<C> | undefined {
  return items.find((i) => i.lang === lang && i.key === item.key);
}

/**
 * Items for a listing in `lang`: everything written in `lang`, plus items
 * that exist only in the other language (shown with a language badge, so
 * untranslated content is still discoverable).
 */
export function forListing<C extends Localized>(items: Parsed<C>[], lang: Lang): Parsed<C>[] {
  const keysInLang = new Set(items.filter((i) => i.lang === lang).map((i) => i.key));
  return items.filter((i) => i.lang === lang || !keysInLang.has(i.key));
}

/** Reading time in minutes at ~220 words per minute (code and math count as words). */
export function readingTime(body: string | undefined): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function postUrl(p: Parsed<"blog">): string {
  return `/${p.lang}/blog/${p.slug}/`;
}

export function projectUrl(p: Parsed<"projects">): string {
  return `/${p.lang}/projects/${p.slug}/`;
}

export function pageUrl(p: Parsed<"pages">): string {
  return `/${p.lang}/${p.slug}/`;
}
