/**
 * Structured data (JSON-LD) for every page: one `@graph` with stable `@id`s
 * (brief R6 §2.5 A, docs/SEO.md).
 *
 *   every page   Person, WebSite (globalGraph)
 *   every indexable page
 *                a WebPage node (WebPage, ProfilePage or CollectionPage) and,
 *                below the home page, a BreadcrumbList (pageGraph, called by
 *                BaseLayout)
 *   posts        BlogPosting + its Blog; listings an ItemList; projects
 *                SoftwareSourceCode (the pages add these themselves)
 *
 * Only what is visible on the page goes in; no FAQ, HowTo, Review or rating
 * markup. `tools/check-seo.mjs` validates required fields, types, that every
 * `{"@id": …}` reference resolves inside the same graph, and that the values
 * match the visible text.
 */
import { person, profile, SITE_URL, sameAs } from "../data/site";
import type { Lang } from "../i18n/ui";
import { ui } from "../i18n/ui";

export type JsonLdNode = Record<string, unknown>;

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** The blog of one language (posts are `isPartOf` it). */
export const blogId = (lang: Lang) => `${SITE_URL}/${lang}/blog/#blog`;
/** The page node of a URL path. */
export const pageId = (path: string) => `${absolute(path)}#webpage`;
export const ref = (id: string) => ({ "@id": id });

/** Global graph nodes, present on every page. `sameAs` comes from the same data as /links. */
export function globalGraph(lang: Lang): JsonLdNode[] {
  return [
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: person.name,
      givenName: person.givenName,
      familyName: person.familyName,
      url: absolute(`/${lang}/`),
      description: profile.summary[lang],
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: person.university.name,
        url: person.university.url,
      },
      knowsAbout: person.knowsAbout,
      knowsLanguage: [...person.languages],
      sameAs,
      // No `email` here on purpose: plain text in JSON-LD on every page would
      // defeat the entity-encoded address on /contact (docs/DECISIONS.md).
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: person.name,
      description: profile.summary.en,
      inLanguage: ["de", "en"],
      author: ref(PERSON_ID),
      publisher: ref(PERSON_ID),
    },
  ];
}

/** The blog of one language as a node (on the blog index and every post). */
export function blogNode(lang: Lang): JsonLdNode {
  return {
    "@type": "Blog",
    "@id": blogId(lang),
    name: `${ui[lang]["blog.title"]} – ${person.name}`,
    url: absolute(`/${lang}/blog/`),
    inLanguage: lang,
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
    isPartOf: ref(WEBSITE_ID),
  };
}

/** A list of links in the order shown on the page (listings). */
export function itemList(path: string, items: { name: string; url: string }[]): JsonLdNode {
  return {
    "@type": "ItemList",
    "@id": `${absolute(path)}#list`,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(it.url),
      name: it.name,
    })),
  };
}

export type PageType = "WebPage" | "ProfilePage" | "CollectionPage";

export interface Crumb {
  name: string;
  path: string;
}

export interface PageGraphOptions {
  lang: Lang;
  path: string;
  name: string;
  description: string;
  type?: PageType | undefined;
  /** Trail between the home page and this page (both excluded). */
  crumbs?: Crumb[] | undefined;
  /** `@id` of the thing the page is about (post, project, list, person). */
  mainEntity?: string | undefined;
  dateModified?: string | undefined;
  /** Absolute path of the page's Open Graph image. */
  image?: string | undefined;
}

/** The page node and its breadcrumb trail (BaseLayout adds them to every indexable page). */
export function pageGraph(o: PageGraphOptions): JsonLdNode[] {
  const url = absolute(o.path);
  const home = `/${o.lang}/`;
  const isHome = o.path === home;
  const nodes: JsonLdNode[] = [];
  const page: JsonLdNode = {
    "@type": o.type ?? "WebPage",
    "@id": pageId(o.path),
    url,
    name: o.name,
    description: o.description,
    inLanguage: o.lang,
    isPartOf: ref(WEBSITE_ID),
    ...(isHome ? { about: ref(PERSON_ID) } : {}),
    ...(o.mainEntity ? { mainEntity: ref(o.mainEntity) } : {}),
    ...(o.dateModified ? { dateModified: o.dateModified } : {}),
    ...(o.image
      ? { primaryImageOfPage: { "@type": "ImageObject", url: absolute(o.image), width: 1200, height: 630 } }
      : {}),
  };
  nodes.push(page);
  if (!isHome) {
    const trail: Crumb[] = [
      { name: person.name, path: home },
      ...(o.crumbs ?? []),
      { name: o.name, path: o.path },
    ];
    page.breadcrumb = ref(`${url}#breadcrumb`);
    nodes.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: absolute(c.path),
      })),
    });
  }
  return nodes;
}

/** Serialise for a <script type="application/ld+json"> data block (not executed, CSP-neutral). */
export function serializeJsonLd(nodes: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
