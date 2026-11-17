/**
 * Markdown twins: `<page URL>index.md` for every content page
 * (src/lib/markdown-twin.ts). The path parameter is the page path without
 * slashes at the ends plus "/index", e.g. "de/blog/some-post/index".
 */
import type { APIRoute } from "astro";
import { allTwins } from "../lib/markdown-twin";

export async function getStaticPaths() {
  return (await allTwins()).map((t) => ({
    params: { twin: `${t.url.replace(/^\/|\/$/g, "")}/index` },
    props: { markdown: t.markdown },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.markdown as string, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
