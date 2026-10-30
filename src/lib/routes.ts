/**
 * One registry of every public URL with its language alternates. Used by
 * sitemap.xml, llms.txt and the search index, so they cannot disagree with
 * each other or with the pages' own hreflang links.
 */
import { LANGS, type Lang, ui } from "../i18n/ui";
import {
  allPages,
  allPosts,
  allProjects,
  forListing,
  isHidden,
  pageUrl,
  postUrl,
  projectUrl,
} from "./content";
import { allCategories, categoryUrl, seriesUrl, tagCounts, tagUrl } from "./taxonomy";

export type RouteKind = "home" | "listing" | "page" | "post" | "project";

export interface RouteEntry {
  url: string;
  lang: Lang;
  kind: RouteKind;
  title: string;
  description: string;
  alternates: Partial<Record<Lang, string>>;
  lastmod?: Date | undefined;
  noindex?: boolean;
  /** Raw Markdown body, for the search index. */
  body?: string | undefined;
}

function both(path: (l: Lang) => string): Partial<Record<Lang, string>> {
  return Object.fromEntries(LANGS.map((l) => [l, path(l)]));
}

export async function allRoutes(): Promise<RouteEntry[]> {
  const [posts, projects, pages, categories] = await Promise.all([
    allPosts(),
    allProjects(),
    allPages(),
    allCategories(),
  ]);
  const newest = (dates: Date[]) =>
    dates.length ? new Date(Math.max(...dates.map((d) => d.valueOf()))) : undefined;
  const postDates = posts.map((p) => p.entry.data.updated ?? p.entry.data.date);
  const projectDates = projects.map((p) => p.entry.data.updated);
  const routes: RouteEntry[] = [];

  for (const lang of LANGS) {
    const t = ui[lang];
    const listing = (path: string, title: string, description: string, lastmod?: Date) =>
      routes.push({
        url: `/${lang}/${path}`,
        lang,
        kind: path === "" ? "home" : "listing",
        title,
        description,
        alternates: both((l) => `/${l}/${path}`),
        lastmod,
      });
    listing("", t["site.title"], t["site.description"], newest([...postDates, ...projectDates]));
    listing("projects/", t["projects.title"], t["projects.description"], newest(projectDates));
    listing("blog/", t["blog.title"], t["blog.description"], newest(postDates));
    listing("blog/archive/", t["blog.archive"], t["blog.archiveDescription"], newest(postDates));
    listing("blog/tags/", t["blog.allTags"], t["blog.description"], newest(postDates));
    listing("links/", t["links.title"], t["links.description"]);
    listing("search/", t["search.title"], t["search.description"]);
    for (const c of categories) {
      const inCat = posts.filter((p) => p.entry.data.category.id === c.id);
      routes.push({
        url: categoryUrl(lang, c.id),
        lang,
        kind: "listing",
        title: c.data.label[lang],
        description: c.data.description[lang],
        alternates: both((l) => categoryUrl(l, c.id)),
        lastmod: newest(inCat.map((p) => p.entry.data.updated ?? p.entry.data.date)),
      });
    }
    const listed = forListing(posts, lang);
    for (const tag of tagCounts(listed)) {
      routes.push({
        url: tagUrl(lang, tag.tag),
        lang,
        kind: "listing",
        title: `#${tag.tag}`,
        description: `${t["blog.postsTagged"]} #${tag.tag} · Blog · ${t["site.title"]}`,
        alternates: { [lang]: tagUrl(lang, tag.tag) },
      });
    }
    const seriesNames = new Set(
      posts.filter((p) => p.lang === lang && p.entry.data.series).map((p) => p.entry.data.series as string),
    );
    for (const name of seriesNames) {
      routes.push({
        url: seriesUrl(lang, name),
        lang,
        kind: "listing",
        title: name,
        description: `${t["blog.postsInSeries"]}: ${name} · Blog · ${t["site.title"]}`,
        alternates: { [lang]: seriesUrl(lang, name) },
      });
    }
  }

  const alternatesOf = <T extends { lang: Lang; key: string }>(
    items: T[],
    item: T,
    url: (i: T) => string,
  ): Partial<Record<Lang, string>> =>
    Object.fromEntries(items.filter((i) => i.key === item.key).map((i) => [i.lang, url(i)]));

  for (const p of pages) {
    routes.push({
      url: pageUrl(p),
      lang: p.lang,
      kind: "page",
      title: p.entry.data.title,
      description: p.entry.data.description,
      alternates: alternatesOf(pages, p, pageUrl),
      lastmod: p.entry.data.updated,
      noindex: p.entry.data.noindex,
      body: p.entry.body,
    });
  }
  for (const p of projects) {
    routes.push({
      url: projectUrl(p),
      lang: p.lang,
      kind: "project",
      title: p.entry.data.title,
      description: p.entry.data.summary,
      alternates: alternatesOf(projects, p, projectUrl),
      lastmod: p.entry.data.updated,
      body: p.entry.body,
    });
  }
  for (const p of posts) {
    routes.push({
      url: postUrl(p),
      lang: p.lang,
      kind: "post",
      title: p.entry.data.title,
      description: p.entry.data.description,
      alternates: alternatesOf(posts, p, postUrl),
      lastmod: p.entry.data.updated ?? p.entry.data.date,
      noindex: isHidden(p),
      body: p.entry.body,
    });
  }
  return routes;
}

/** Markdown → rough plain text for the search index and llms.txt. */
export function plainText(markdown: string | undefined): string {
  return (markdown ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[^\n]*\n/g, " ")
    .replace(/```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\^\d+\]:?/g, " ")
    .replace(/[#>*_`|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
