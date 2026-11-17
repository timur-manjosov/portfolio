import { render } from "astro:content";
import rss from "@astrojs/rss";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
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

let container: AstroContainer | undefined;

/**
 * Full text of a post for <content:encoded> (brief R6 §2.5 A): the rendered
 * post body, standalone outside the site. Heading anchors and the written
 * "scroll the table" hints go (feed readers neither scroll nor need them),
 * site-relative URLs become absolute, focusable scroll boxes lose tabindex.
 */
export function feedHtml(html: string): string {
  return html
    .replace(/<a class="heading-anchor"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/<p class="table-hint"[^>]*>[\s\S]*?<\/p>/g, "")
    .replace(/ tabindex="0"/g, "")
    .replace(/ (href|src)="\/(?!\/)/g, ` $1="${SITE_URL}/`);
}

async function fullText(p: Parsed<"blog">): Promise<string> {
  container ??= await AstroContainer.create();
  const { Content } = await render(p.entry);
  return feedHtml(await container.renderToString(Content));
}

/** RSS 2.0 feed with full text. Only posts written in `lang` (no cross-language mixing). */
export async function blogFeed(o: FeedOptions): Promise<Response> {
  const posts = o.posts.filter((p) => p.lang === o.lang);
  const content = await Promise.all(posts.map(fullText));
  const self = new URL(o.selfPath, SITE_URL).href;
  return rss({
    title: o.title,
    description: o.description,
    // Channel <link>: the blog in this language. Item links are absolute
    // paths, so they resolve against the origin only.
    site: `${SITE_URL}/${o.lang}/blog/`,
    trailingSlash: true,
    // xmlns:content is added by @astrojs/rss as soon as an item has content.
    xmlns: { atom: "http://www.w3.org/2005/Atom", dc: "http://purl.org/dc/elements/1.1/" },
    customData: [
      `<language>${o.lang}</language>`,
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    ].join(""),
    items: posts.map((p, i) => ({
      title: p.entry.data.title,
      link: postUrl(p),
      pubDate: p.entry.data.date,
      description: p.entry.data.description,
      content: content[i],
      categories: [o.categoryLabel(p.entry.data.category.id), ...p.entry.data.tags],
      // RSS <author> must be an e-mail address; dc:creator takes a name.
      customData: "<dc:creator>Timur Manjosov</dc:creator>",
    })),
  });
}
