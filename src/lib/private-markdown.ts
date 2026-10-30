/**
 * Renders the optional private Markdown (about_extra) at build time with the
 * same rules as the content collections: Prism classes instead of inline
 * styles, MathML, HTML comments stripped. tools/check-csp.mjs then checks the
 * result like every other page.
 */
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeStripComments from "./rehype-strip-comments";
import rehypeTemml from "./rehype-temml";

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | undefined;

export async function renderPrivateMarkdown(markdown: string): Promise<string> {
  processor ??= await createMarkdownProcessor({
    syntaxHighlight: "prism",
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeStripComments, rehypeTemml],
  });
  return (await processor.render(markdown)).code;
}
