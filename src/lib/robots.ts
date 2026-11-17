/**
 * robots.txt text from the crawler groups (src/data/crawlers.ts): one group
 * per switch, then everyone else (allowed), then the sitemap. Pure, so
 * tools/check-ai.mjs can test the switches without a build.
 */
import type { CrawlerGroup } from "../data/crawlers";

function group(g: CrawlerGroup): string[] {
  return [
    `# ${g.label}: ${g.allow ? "allowed" : "blocked"}`,
    ...g.agents.map((a) => `User-agent: ${a.token}`),
    g.allow ? "Allow: /" : "Disallow: /",
    "",
  ];
}

export function robotsTxt(groups: { search: CrawlerGroup; training: CrawlerGroup }, siteUrl: string): string {
  return [
    "# timurmanjosov.com: everything may be read unless a group below says otherwise.",
    "# A request to well-behaved crawlers, not an access control.",
    "",
    ...group(groups.search),
    ...group(groups.training),
    "# Everyone else",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
}
