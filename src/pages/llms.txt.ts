/**
 * llms.txt (https://llmstxt.org/): a short Markdown profile and site map for
 * language models. A cheap extra; whether AI providers actually read it is
 * not documented (see docs/DECISIONS.md, "llms.txt").
 */
import { accounts, person, SITE_URL } from "../data/site";
import { ui } from "../i18n/ui";
import { allRoutes } from "../lib/routes";

export async function GET() {
  const routes = (await allRoutes()).filter((r) => !r.noindex);
  const abs = (p: string) => new URL(p, SITE_URL).href;
  const list = (kind: string, lang: "de" | "en") =>
    routes
      .filter((r) => r.kind === kind && r.lang === lang)
      .map((r) => `- [${r.title}](${abs(r.url)}): ${r.description}`);
  const germanOnlyProjects = routes
    .filter((r) => r.kind === "project" && r.lang === "de" && !r.alternates.en)
    .map((r) => `- [${r.title}](${abs(r.url)}): ${r.description}`);
  // A section only appears when it has entries.
  const section = (heading: string, items: string[]) => (items.length ? [heading, ...items, ""] : []);

  const lines = [
    `# ${person.name}`,
    "",
    `> ${ui.en["site.description"]}`,
    "",
    "Stable facts:",
    `- Name: ${person.name}`,
    `- Studies: Mathematics (distance learning) at ${person.university.name}, focus on cryptography, minor in computer science`,
    "- Programming languages: Python (most public projects), Java (most solid foundation), Rust and C (learning), Kotlin and Go (used less)",
    "- Projects: Discord bots (Aura, Epiphyte), a world simulator (Saeculum), small tools for maths",
    "- Interests: cryptography, game theory, emergent systems, generative maths art; privacy and self-hosting",
    `- Website: ${SITE_URL}/ (German: ${SITE_URL}/de/, English: ${SITE_URL}/en/)`,
    ...accounts.map((a) => `- ${a.label}: ${a.url}`),
    "",
    "## Main pages (English)",
    `- [About](${abs("/en/about/")})`,
    `- [Projects](${abs("/en/projects/")})`,
    `- [Blog](${abs("/en/blog/")}) (RSS: ${abs("/en/feed.xml")})`,
    `- [Now](${abs("/en/now/")})`,
    `- [Contact](${abs("/en/contact/")})`,
    `- [Links](${abs("/en/links/")})`,
    "",
    "## Hauptseiten (Deutsch)",
    `- [Über mich](${abs("/de/about/")})`,
    `- [Projekte](${abs("/de/projects/")})`,
    `- [Blog](${abs("/de/blog/")}) (RSS: ${abs("/de/feed.xml")})`,
    `- [Jetzt](${abs("/de/now/")})`,
    `- [Kontakt](${abs("/de/contact/")})`,
    `- [Links](${abs("/de/links/")})`,
    "",
    ...section("## Projects", list("project", "en")),
    ...section("## Projekte (nur auf Deutsch)", germanOnlyProjects),
    ...section("## Blog posts (English)", list("post", "en")),
    ...section("## Blogbeiträge (Deutsch)", list("post", "de")),
    "## Optional",
    `- [Sitemap](${abs("/sitemap.xml")})`,
    `- [Uses](${abs("/en/uses/")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
