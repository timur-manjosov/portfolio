import rss from "@astrojs/rss";
import { SITE_URL } from "../data/site";
import type { Lang } from "../i18n/ui";
import { type Parsed, postUrl } from "./content";

interface FeedOptions {
  lang: Lang;
  title: string;
  description: string;
  /** Path of the feed itself, for the atom:self link. */
  selfPath: string;
  posts: Parsed<"blog">[];
  categoryLabel: (id: string) => string;
}

/** RSS 2.0 feed. Only posts written in `lang` (no cross-language mixing). */
export function blogFeed(o: FeedOptions): Promise<Response> {
  const self = new URL(o.selfPath, SITE_URL).href;
  return rss({
    title: o.title,
    description: o.description,
    // Channel <link>: the blog in this language. Item links are absolute
    // paths, so they resolve against the origin only.
    site: `${SITE_URL}/${o.lang}/blog/`,
    trailingSlash: true,
    xmlns: { atom: "http://www.w3.org/2005/Atom", dc: "http://purl.org/dc/elements/1.1/" },
    customData: [
      `<language>${o.lang}</language>`,
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    ].join(""),
    items: o.posts
      .filter((p) => p.lang === o.lang)
      .map((p) => ({
        title: p.entry.data.title,
        link: postUrl(p),
        pubDate: p.entry.data.date,
        description: p.entry.data.description,
        categories: [o.categoryLabel(p.entry.data.category.id), ...p.entry.data.tags],
        // RSS <author> must be an e-mail address; dc:creator takes a name.
        customData: "<dc:creator>Timur Manjosov</dc:creator>",
      })),
  });
}
