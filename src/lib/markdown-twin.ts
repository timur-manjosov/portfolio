/**
 * Markdown twins (brief R6 §2.5 B, llmstxt.org): every content page is also
 * published as plain Markdown at `<page URL>index.md`, linked from the page
 * with `<link rel="alternate" type="text/markdown">`. Posts, projects and the
 * pages About, Now and Uses have one; legal pages and contact do not (their
 * text depends on private data, and they are not content).
 *
 * The twin is the Markdown source as written, with a small header (title,
 * URL, dates, language, author), HTML comments removed and site-relative
 * links made absolute, so it stands on its own outside the site. Formulas
 * stay TeX, which language models read better than MathML.
 */
import { aboutExtra, person, SITE_URL } from "../data/site";
import type { Lang } from "../i18n/ui";
import { isoDate } from "../i18n/utils";
import { allPages, allPosts, allProjects, isHidden, pageUrl, postUrl, projectUrl } from "./content";

export const TWIN_PAGES = ["about", "now", "uses"];

export interface Twin {
  /** HTML page URL (path). */
  url: string;
  lang: Lang;
  kind: "post" | "project" | "page";
  title: string;
  markdown: string;
}

/** The twin's path for a page path ending in "/". */
export const twinPath = (url: string) => `${url}index.md`;

const yaml = (s: string) => JSON.stringify(s);

/** An inline SVG figure as words: its <title> and <desc> (both are required by the image policy). */
function svgText(svg: string, lang: Lang): string {
  const pick = (tag: string) =>
    svg
      .match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
      ?.replace(/\s+/g, " ")
      .trim();
  const parts = [pick("title"), pick("desc")].filter(Boolean).join(". ");
  return `*[${lang === "de" ? "Grafik" : "Figure"}: ${parts}]*`;
}

/** Site-relative links and images → absolute; comments and formula
 *  descriptions out; images and inline SVG figures become their text
 *  alternative, figure captions stay. */
export function standalone(body: string, lang: Lang): string {
  return (
    body
      .replace(/<!--[\s\S]*?-->\n?/g, "")
      // A formula's spoken description ("$tex %% words$", rehype-temml) is
      // for screen readers; the twin keeps plain TeX.
      .replace(/\s*(?<!\\)%%[^$\n]*(?=\$)/g, "")
      .replace(/<svg\b[\s\S]*?<\/svg>/g, (svg) => svgText(svg, lang))
      .replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g, (_, c: string) => `\n\n${c.trim()}`)
      .replace(/<\/?figure[^>]*>/g, "")
      .replace(/!\[([^\]]*)\]\((?!https?:)[^)]*\)/g, (_, alt: string) =>
        lang === "de" ? `*[Bild: ${alt}]*` : `*[Image: ${alt}]*`,
      )
      .replace(/\]\((\/[^)\s]*)\)/g, (_, path: string) => `](${SITE_URL}${path})`)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function render(o: {
  url: string;
  lang: Lang;
  title: string;
  description: string;
  date?: Date | undefined;
  updated?: Date | undefined;
  body: string;
}): string {
  const head = [
    "---",
    `title: ${yaml(o.title)}`,
    `url: ${SITE_URL}${o.url}`,
    ...(o.date ? [`date: ${isoDate(o.date)}`] : []),
    ...(o.updated ? [`updated: ${isoDate(o.updated)}`] : []),
    `language: ${o.lang}`,
    `author: ${yaml(person.name)}`,
    `description: ${yaml(o.description)}`,
    "---",
  ];
  return `${head.join("\n")}\n\n# ${o.title}\n\n${standalone(o.body, o.lang)}\n`;
}

/** All twins of the build (hidden posts never). */
export async function allTwins(): Promise<Twin[]> {
  const [posts, projects, pages] = await Promise.all([allPosts(), allProjects(), allPages()]);
  const twins: Twin[] = [];
  for (const p of posts) {
    if (isHidden(p)) continue;
    const d = p.entry.data;
    const url = postUrl(p);
    twins.push({
      url,
      lang: p.lang,
      kind: "post",
      title: d.title,
      markdown: render({
        url,
        lang: p.lang,
        title: d.title,
        description: d.description,
        date: d.date,
        updated: d.updated,
        body: p.entry.body ?? "",
      }),
    });
  }
  for (const p of projects) {
    const d = p.entry.data;
    const url = projectUrl(p);
    twins.push({
      url,
      lang: p.lang,
      kind: "project",
      title: d.title,
      markdown: render({
        url,
        lang: p.lang,
        title: d.title,
        description: d.summary,
        updated: d.updated,
        body: p.entry.body ?? "",
      }),
    });
  }
  for (const p of pages) {
    if (!TWIN_PAGES.includes(p.slug) || p.entry.data.noindex) continue;
    const d = p.entry.data;
    const url = pageUrl(p);
    // About may have a private addition (shown on the page, so in the twin too).
    const extra = p.slug === "about" ? aboutExtra[p.lang] : null;
    twins.push({
      url,
      lang: p.lang,
      kind: "page",
      title: d.title,
      markdown: render({
        url,
        lang: p.lang,
        title: d.title,
        description: d.description,
        updated: d.updated,
        body: `${p.entry.body ?? ""}${extra ? `\n\n${extra}` : ""}`,
      }),
    });
  }
  return twins;
}
