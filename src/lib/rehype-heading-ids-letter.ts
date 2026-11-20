/**
 * Heading ids that start with a letter. A heading like "1. Nichts tun …"
 * gets the slug "1-nichts-tun-…"; HTML allows that, but the site's HTML
 * validation (html-validate `valid-id`) wants ids that also work as plain
 * CSS selectors. Such ids get a word in front: "abschnitt-1-nichts-tun-…" /
 * "section-1-do-nothing-…".
 *
 * Runs right after Astro's rehypeHeadingIds and updates the heading list
 * Astro collected there (file.data.astro.headings), so the table of contents
 * and the anchor links use the same ids.
 */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}
interface VFileLike {
  path?: string;
  history?: string[];
  data: { astro?: { headings?: { slug: string }[] } };
}

const HEADING = /^h[1-6]$/;

export function letterId(id: string, lang: "de" | "en"): string {
  return /^[a-z]/i.test(id) ? id : `${lang === "de" ? "abschnitt" : "section"}-${id}`;
}

export default function rehypeHeadingIdsLetter() {
  return (tree: HastNode, file: VFileLike) => {
    const path = file.path ?? file.history?.[0] ?? "";
    const lang = /[\\/]de[\\/][^\\/]+$/.test(path) ? "de" : "en";
    const renamed = new Map<string, string>();
    const visit = (n: HastNode) => {
      if (n.type === "element" && HEADING.test(n.tagName ?? "") && typeof n.properties?.id === "string") {
        const id = n.properties.id;
        const next = letterId(id, lang);
        if (next !== id) {
          n.properties.id = next;
          renamed.set(id, next);
        }
      }
      for (const c of n.children ?? []) visit(c);
    };
    visit(tree);
    for (const h of file.data.astro?.headings ?? []) h.slug = renamed.get(h.slug) ?? h.slug;
  };
}
