import { crawlers } from "../data/crawlers";
import { SITE_URL } from "../data/site";
import { robotsTxt } from "../lib/robots";

/**
 * robots.txt from src/data/crawlers.ts (one switch per group). The switches
 * and what robots.txt can and cannot do: docs/SEO.md.
 */
export function GET() {
  return new Response(robotsTxt(crawlers, SITE_URL), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
