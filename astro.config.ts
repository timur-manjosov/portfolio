import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkMath from "remark-math";
import rehypeArticle from "./src/lib/rehype-article";
import rehypeFootnoteLang from "./src/lib/rehype-footnote-lang";
import rehypeStripComments from "./src/lib/rehype-strip-comments";
import rehypeTemml from "./src/lib/rehype-temml";
import remarkImagePolicy from "./src/lib/remark-image-policy";

// Static output only: Caddy serves dist/ directly, no server runtime
// (docs/adr/0001-stack.md).
export default defineConfig({
  site: "https://timurmanjosov.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
    // The live CSP is `style-src 'self'` without 'unsafe-inline': every
    // stylesheet must be an external file. tools/check-csp.mjs enforces it.
    inlineStylesheets: "never",
  },
  // Plain HTML whitespace semantics (Astro 7's default 'jsx' mode drops
  // spaces between inline elements).
  compressHTML: true,
  i18n: {
    locales: ["de", "en"],
    defaultLocale: "en",
    routing: {
      // Every page lives under /de/ or /en/. "/" redirects by the first
      // Accept-Language entry in Caddy (deploy/site-config.json); the static
      // src/pages/index.astro is only the script fallback.
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  markdown: {
    // Prism emits classes; Shiki emits inline style attributes (CSP).
    syntaxHighlight: "prism",
    processor: unified({
      // Images: local, with alt text, never external (build fails otherwise).
      remarkPlugins: [remarkMath, remarkImagePolicy],
      rehypePlugins: [
        rehypeStripComments,
        rehypeFootnoteLang,
        rehypeTemml,
        // Astro adds heading ids after user plugins; the autolinker needs
        // them earlier.
        rehypeHeadingIds,
        // A real, focusable link after each heading, grouped with it in
        // div.heading. Its name is "<Link to this section> <heading>": the
        // first part is a hidden element on every page that renders
        // Markdown (#heading-anchor-label, translated), so the plugin needs
        // no language (R6 finding B14).
        [
          rehypeAutolinkHeadings,
          {
            behavior: "after",
            group: { type: "element", tagName: "div", properties: { className: ["heading"] }, children: [] },
            properties: (heading: { properties: { id?: unknown } }) => ({
              className: ["heading-anchor"],
              ariaLabelledby: `heading-anchor-label ${String(heading.properties.id)}`,
            }),
            content: { type: "text", value: "#" },
          },
        ],
        rehypeArticle,
      ],
    }),
  },
  vite: {
    build: {
      // Never inline small scripts/assets into HTML (CSP, see above).
      assetsInlineLimit: 0,
    },
  },
  devToolbar: { enabled: false },
});
