/**
 * llms-full.txt: every published post in full as Markdown (the twins of
 * src/lib/markdown-twin.ts, newest first, English then German), without
 * navigation. Scheduled posts and drafts never appear (allTwins skips them).
 * Brief R6 §2.5 B: kept while it stays well under 1.5 MB (check:ai).
 */
import { profile } from "../data/site";
import { allTwins } from "../lib/markdown-twin";

export async function GET() {
  const posts = (await allTwins()).filter((t) => t.kind === "post");
  const ordered = [...posts.filter((t) => t.lang === "en"), ...posts.filter((t) => t.lang === "de")];
  const body = [
    `# ${profile.name}: all posts in full`,
    "",
    `> ${profile.summary.en}`,
    "",
    `${ordered.length} posts, each as published, separated by a line of five equals signs. The overview of the site is /llms.txt.`,
    "",
    ...ordered.flatMap((t) => ["=====", "", t.markdown.trim(), ""]),
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
