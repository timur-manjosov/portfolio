/**
 * Search index for both languages in one file (searching across languages
 * is a requirement). Built at build time; the browser fetches it from this
 * origin only when someone uses the search. Short keys keep it small.
 */
import { allRoutes, plainText } from "../lib/routes";

export async function GET() {
  const routes = (await allRoutes()).filter(
    (r) => !r.noindex && (r.kind === "post" || r.kind === "project" || r.kind === "page"),
  );
  const docs = routes.map((r) => ({
    u: r.url,
    l: r.lang,
    k: r.kind,
    // Languages this document exists in, so the client can skip the
    // other-language copy when a translation in the page language exists.
    v: Object.keys(r.alternates),
    t: r.title,
    d: r.description,
    x: plainText(r.body),
  }));
  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
