import { type CollectionEntry, getCollection } from "astro:content";
import type { Lang } from "../i18n/ui";
import { slugify } from "../i18n/utils";
import type { Parsed } from "./content";

export type Category = CollectionEntry<"categories">;

export async function allCategories(): Promise<Category[]> {
  const cats = await getCollection("categories");
  return cats.sort((a, b) => a.data.order - b.data.order);
}

export async function categoryMap(): Promise<Map<string, Category>> {
  return new Map((await allCategories()).map((c) => [c.id, c]));
}

export function categoryUrl(lang: Lang, id: string): string {
  return `/${lang}/blog/category/${id}/`;
}

export function tagUrl(lang: Lang, tag: string): string {
  return `/${lang}/blog/tags/${slugify(tag)}/`;
}

export function seriesUrl(lang: Lang, series: string): string {
  return `/${lang}/blog/series/${slugify(series)}/`;
}

/** Tags used by the given posts, with counts, sorted by name. */
export function tagCounts(posts: Parsed<"blog">[]): { tag: string; slug: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const p of posts) {
    for (const tag of p.entry.data.tags) {
      const slug = slugify(tag);
      const current = counts.get(slug);
      counts.set(slug, { tag: current?.tag ?? tag, count: (current?.count ?? 0) + 1 });
    }
  }
  return [...counts.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}
