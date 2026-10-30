import { SITE_URL } from "../data/site";

/**
 * Everything may be crawled, including by AI crawlers: the goal is to be
 * findable (decision and how to change it: docs/DECISIONS.md, "AI crawlers").
 */
export function GET() {
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${SITE_URL}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
