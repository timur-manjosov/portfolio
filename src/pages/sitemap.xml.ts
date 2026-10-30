import { SITE_URL } from "../data/site";
import { isoDate } from "../i18n/utils";
import { allRoutes } from "../lib/routes";

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Sitemap with xhtml:link language alternates (Google's hreflang-in-sitemap format). */
export async function GET() {
  const routes = (await allRoutes()).filter((r) => !r.noindex);
  const abs = (path: string) => xmlEscape(new URL(path, SITE_URL).href);
  // "/" itself is not listed: it always redirects (302 by Accept-Language),
  // and a sitemap lists final URLs only. It stays the x-default alternate of
  // the two home pages, which is what x-default is meant for.
  const urls = [
    ...routes.map((r) => {
      const alts = Object.entries(r.alternates);
      const links =
        alts.length > 1
          ? [
              ...alts.map(([l, href]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(href)}"/>`),
              `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(r.kind === "home" ? "/" : (r.alternates.en ?? r.url))}"/>`,
            ].join("")
          : "";
      const lastmod = r.lastmod ? `<lastmod>${isoDate(r.lastmod)}</lastmod>` : "";
      return `<url><loc>${abs(r.url)}</loc>${lastmod}${links}</url>`;
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
