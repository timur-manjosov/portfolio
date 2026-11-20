/**
 * llms.txt after the llmstxt.org format (read 2026-11-17): H1 with the name,
 * a blockquote with the summary, free text without headings, then H2
 * sections of links with one sentence each; "Optional" holds what can be
 * skipped. Whether AI providers read it is not documented (docs/SEO.md); it
 * is cheap, so it is provided.
 *
 * Every value comes from the content or from src/data/site.ts (the single
 * source of name, role and summary); nothing is written twice by hand.
 * Scheduled posts and drafts never appear (routes filter them).
 */
import { accounts, person, profile, SITE_URL } from "../data/site";
import { ui } from "../i18n/ui";
import { TWIN_PAGES } from "../lib/markdown-twin";
import { allRoutes, type RouteEntry } from "../lib/routes";

export async function GET() {
  const routes = (await allRoutes()).filter((r) => !r.noindex);
  const abs = (p: string) => new URL(p, SITE_URL).href;
  const entry = (r: RouteEntry) => `- [${r.title}](${abs(r.url)}): ${r.description}`;
  const of = (kind: RouteEntry["kind"], lang: "de" | "en") =>
    routes.filter((r) => r.kind === kind && r.lang === lang);
  const page = (lang: "de" | "en", slug: string) => routes.find((r) => r.url === `/${lang}/${slug}/`);
  // Projects in English, plus those that exist only in German.
  const projects = [...of("project", "en"), ...of("project", "de").filter((r) => !r.alternates.en)];
  const section = (heading: string, items: string[]) => (items.length ? [heading, "", ...items, ""] : []);
  const pages = (lang: "de" | "en", slugs: string[]) =>
    slugs.flatMap((s) => {
      const r = page(lang, s);
      return r ? [entry(r)] : [];
    });

  const lines = [
    `# ${person.name}`,
    "",
    `> ${profile.summary.en}`,
    "",
    `${profile.role.en}. The site is written in German and English; most pages exist in both (\`/de/…\` and \`/en/…\`). Every post, project and the pages ${TWIN_PAGES.join(", ")} are also available as Markdown: append \`index.md\` to the page URL.`,
    "",
    `- Studies: ${profile.study.en}, ${person.university.name}; ${profile.focus.en}`,
    `- Programming languages, most used first: ${person.programmingLanguages.join(", ")}`,
    ...accounts.map((a) => `- ${a.label}: ${a.url}`),
    "",
    ...section("## About", pages("en", ["about", "now", "contact"])),
    ...section("## Über mich (Deutsch)", pages("de", ["about", "now", "contact"])),
    ...section("## Projects", projects.map(entry)),
    ...section("## Blog posts (English)", of("post", "en").map(entry)),
    ...section("## Blogbeiträge (Deutsch)", of("post", "de").map(entry)),
    ...section("## Optional", [
      `- [All posts in full](${abs("/llms-full.txt")}): every published post as Markdown in one file`,
      `- [${ui.en["blog.title"]} (English)](${abs("/en/blog/")}): all English posts, with RSS at ${abs("/en/feed.xml")}`,
      `- [${ui.de["blog.title"]} (Deutsch)](${abs("/de/blog/")}): alle deutschen Beiträge, RSS unter ${abs("/de/feed.xml")}`,
      ...pages("en", ["uses", "links"]),
      `- [Sitemap](${abs("/sitemap.xml")}): every public URL with its language versions and last change`,
    ]),
  ];
  return new Response(`${lines.join("\n").trimEnd()}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
